#!/usr/bin/env python3
"""One-slide-per-BBL Brooklyn profiles, using NYC MapPLUTO and 2024 orthophotos."""
import os, io, csv, json, math, time, collections
from pathlib import Path
from urllib.parse import quote
import requests
from PIL import Image, ImageDraw, ImageFont, ImageOps
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

SITES=[
("3051120021","126 STRATFORD ROAD"),
("3051180025","190 MARLBOROUGH ROAD"),
("3051180049","205 RUGBY ROAD"),
("3051180052","197 RUGBY ROAD"),
("3051120027","51 TURNER PLACE"),
("3051120029","39 TURNER PLACE"),
("3051130015","160 STRATFORD ROAD"),
("3051130033","511 CONEY ISLAND AVENUE"),
("3051130034","509 CONEY ISLAND AVENUE"),
("3051130035","50 TURNER PLACE"),
]
BASE="https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query"
AERIAL="https://tiles.arcgis.com/tiles/yG5s3afENB5iO9fj/arcgis/rest/services/NYC_Orthos_2024/MapServer/tile"
CARTO="https://services.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile"
MERC=20037508.342789244
R=156543.03392804097
DEST=Path("output"); DEST.mkdir(exist_ok=True)
session=requests.Session()
session.headers.update({"User-Agent":"BrooklynBBLProfileDeck/1.0 (NYC public parcel map rendering)"})
tile_cache={}
colors={"01":"#f6d3ac","02":"#edd4aa","03":"#fac683","04":"#f6ed9d","05":"#a9bedf","06":"#b6add6","07":"#f4b5b6","08":"#c2add9","09":"#c6c7c9","10":"#93be9a","11":"#cbe4ca"}
def net(url,**kwargs):
    for i in range(3):
        try:
            r=session.get(url,timeout=25,**kwargs);r.raise_for_status();return r
        except requests.RequestException:
            if i==2:raise
            time.sleep(1.5*(i+1))
def query(params):
    params={"f":"json","outSR":"3857","returnGeometry":"true",**params}
    d=net(BASE,params=params).json()
    if "error" in d:raise RuntimeError(str(d["error"]))
    return d.get("features",[])
def xx(lat,lon):
    lat=max(-85.0,min(85.0,lat))
    return (lon*MERC/180, math.log(math.tan(math.pi/4+math.radians(lat)/2))*MERC/math.pi)
def ll(x,y):
    return (math.degrees(2*math.atan(math.exp(y*math.pi/MERC))-math.pi/2),x*180/MERC)
def bounds(geom):
    a=[p for ring in geom["rings"] for p in ring]
    xs=[x[0] for x in a];ys=[x[1] for x in a]
    return min(xs),min(ys),max(xs),max(ys)
def frame(geom, zoom, w,h):
    x1,y1,x2,y2=bounds(geom); cx=(x1+x2)/2;cy=(y1+y2)/2
    res=R/(2**zoom)
    # Keep the subject at least ~25% of usable width for aerial images, without truncation.
    lotspan=max((x2-x1),(y2-y1))
    if lotspan/max(1,min(w,h)*res)>.42:
        zoom=max(16,zoom-math.ceil(math.log2(lotspan/(min(w,h)*res*.42))))
        res=R/(2**zoom)
    return cx,cy,res,zoom
def tile(layer,z,tx,ty):
    key=(layer,z,tx,ty)
    if key in tile_cache:return tile_cache[key]
    url=(AERIAL+f"/{z}/{ty}/{tx}" if layer=="aerial" else CARTO+f"/{z}/{ty}/{tx}")
    try:
        r=net(url)
        im=Image.open(io.BytesIO(r.content)).convert("RGB")
        if im.size!=(256,256):raise ValueError("Bad tile dimensions")
        tile_cache[key]=im
        return im
    except Exception as exc:
        print("TILE_FAIL",layer,z,tx,ty,str(exc)[:90],flush=True)
        return None
def tile_image(layer,cx,cy,res,z,w,h):
    canv=Image.new("RGB",(w,h),"#f1f5f6")
    cpx=(cx+MERC)/res
    cpy=(MERC-cy)/res
    startx=cpx-w/2;starty=cpy-h/2
    tx0=math.floor(startx/256);tx1=math.floor((startx+w-1)/256)
    ty0=math.floor(starty/256);ty1=math.floor((starty+h-1)/256)
    good=0
    for ty in range(ty0,ty1+1):
        for tx in range(tx0,tx1+1):
            img=tile(layer,z,tx,ty)
            if img is not None:
                canv.paste(img,(round(tx*256-startx),round(ty*256-starty)));good+=1
    return canv,good>0
def pos(x,y,cx,cy,res,w,h):
    return (w/2+(x-cx)/res,h/2-(y-cy)/res)
def paint_polygons(img,features,cx,cy,res,fill=True):
    w,h=img.size; dr=ImageDraw.Draw(img,"RGBA")
    for f in features:
        geom=f.get("geometry") or {}
        col=colors.get(str(f.get("attributes",{}).get("LandUse","")).zfill(2),"#dce5e5")
        if "rings" not in geom:continue
        rgb=tuple(bytes.fromhex(col[1:]))
        for ring in geom["rings"]:
            pts=[pos(x,y,cx,cy,res,w,h) for x,y in ring]
            if len(pts)>=3:
                if fill:dr.polygon(pts,fill=(*rgb,190))
                dr.line(pts+[pts[0]],fill=(113,132,143,130),width=1,joint="curve")
def subject_outline(img,geom,cx,cy,res):
    w,h=img.size
    dr=ImageDraw.Draw(img,"RGBA")
    for ring in geom["rings"]:
        pts=[pos(x,y,cx,cy,res,w,h) for x,y in ring]
        if len(pts)<3:continue
        dr.line(pts+[pts[0]],fill=(255,255,255,255),width=12,joint="curve")
        dr.line(pts+[pts[0]],fill=(221,31,43,255),width=7,joint="curve")
    # North-up, red subject outline uses the source polygon, never an approximated rectangle.
def request_context(cx,cy,res,w,h):
    b=f"{cx-w*res*.53},{cy-h*res*.53},{cx+w*res*.53},{cy+h*res*.53}"
    return query({"where":"1=1","geometry":b,"geometryType":"esriGeometryEnvelope",
        "inSR":"3857","spatialRel":"esriSpatialRelIntersects",
        "outFields":"BBL,LandUse","resultRecordCount":"2000"})
def render(subject,index,typ,w,h):
    z=19 if typ=="land" else 20
    cx,cy,res,z=frame(subject["geometry"],z,w,h)
    img,tiles_ok=tile_image("land" if typ=="land" else "aerial",cx,cy,res,z,w,h)
    featn=0
    if typ=="land":
        context=request_context(cx,cy,res,w,h)
        featn=len(context)
        paint_polygons(img,context,cx,cy,res,True)
    subject_outline(img,subject["geometry"],cx,cy,res)
    out=DEST/f"{index:02d}_{typ}.png";img.save(out,optimize=True)
    return out,tiles_ok,featn
def angular_error(a,b):
    return abs((a-b+180)%360-180)
def distance(lat1,lon1,lat2,lon2):
    phi1=math.radians(lat1);phi2=math.radians(lat2)
    dp=phi2-phi1;dl=math.radians(lon2-lon1)
    h=math.sin(dp/2)**2+math.cos(phi1)*math.cos(phi2)*math.sin(dl/2)**2
    return 6371000*2*math.asin(min(1,math.sqrt(h)))
def bearing(lat1,lon1,lat2,lon2):
    p1=math.radians(lat1);p2=math.radians(lat2);dl=math.radians(lon2-lon1)
    return (math.degrees(math.atan2(math.sin(dl)*math.cos(p2),math.cos(p1)*math.sin(p2)-math.sin(p1)*math.cos(p2)*math.cos(dl)))+360)%360
def street_photo(subject,index):
    geom=subject["geometry"];b=bounds(geom);lat,lon=ll((b[0]+b[2])/2,(b[1]+b[3])/2)
    try:
        resp=session.post("https://api.openstreetcam.org/1.0/list/nearby-photos/",
            data={"lat":lat,"lng":lon,"radius":65},timeout=20)
        resp.raise_for_status();js=resp.json()
        if int(js.get("status",{}).get("apiCode",0))!=600:return None,"KartaView not available (API status)"
        dat=js.get("result",{}).get("data",[])
        choices=[]
        for p in dat:
            plat=float(p.get("lat",0));plon=float(p.get("lng",0))
            d=distance(lat,lon,plat,plon)
            if d>65:continue
            heading=p.get("heading")
            delta=angular_error(float(heading),bearing(plat,plon,lat,lon)) if heading not in (None,"") else 999
            if delta>70:continue
            filename=(p.get("fileurl") or p.get("fileUrl") or p.get("filepath") or p.get("filePath") or "")
            if not filename:continue
            choices.append((d+delta*.6,p,d,delta,filename))
        if not choices:return None,"No sufficiently aligned KartaView photograph within 65 m"
        choices.sort(key=lambda x:x[0])
        for _,p,d,delta,filename in choices[:5]:
            u=filename if filename.startswith("http") else "https://api.openstreetcam.org/"+filename.lstrip("/")
            try:
                r=net(u)
                im=Image.open(io.BytesIO(r.content)).convert("RGB")
                if im.width<500:continue
                out=DEST/f"{index:02d}_street_kartaview.jpg"
                im.save(out,quality=91,optimize=True)
                return out, f"KartaView candidate {d:.0f} m away, heading offset {delta:.0f}° (NOT property-verified)"
            except Exception:pass
    except Exception as e:return None,"KartaView lookup failed: "+str(e)[:100]
    return None,"KartaView photo download unavailable"
def font(size=12,bold=False):
    return ("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
def crop_to(path,w,h):
    im=Image.open(path).convert("RGB")
    return ImageOps.fit(im,(w,h),method=Image.Resampling.LANCZOS,centering=(.5,.5))
def rgb(s):
    s=s.replace("#","");return RGBColor(int(s[0:2],16),int(s[2:4],16),int(s[4:6],16))
def text(sl,txt,x,y,w,h,size=12,color="#15334B",bold=False,link=None):
    box=sl.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf=box.text_frame;tf.clear();tf.word_wrap=True
    p=tf.paragraphs[0];p.alignment=PP_ALIGN.LEFT
    run=p.add_run();run.text=txt;run.font.name="Aptos";run.font.size=Pt(size);run.font.bold=bold;run.font.color.rgb=rgb(color)
    if link:run.hyperlink.address=link
    return box
def rect(sl,x,y,w,h,fill="#E7EEF1",line=None):
    from pptx.enum.shapes import MSO_SHAPE
    r=sl.shapes.add_shape(MSO_SHAPE.RECTANGLE, Inches(x), Inches(y), Inches(w), Inches(h))
    r.fill.solid();r.fill.fore_color.rgb=rgb(fill)
    r.line.fill.background() if line is None else None
    return r
def make_deck(rows):
    ppt=Presentation();ppt.slide_width=Inches(13.333);ppt.slide_height=Inches(7.5)
    for i,r in enumerate(rows,1):
        sl=ppt.slides.add_slide(ppt.slide_layouts[6])
        rect(sl,0,0,13.333,.095,"#DD2431")
        text(sl,"NYC TAX LOT  /  PROPERTY PROFILE",.52,.28,7,.23,9,"#526D7B",True)
        text(sl,r["Address"],.53,.62,11.5,.5,24,"#153348",True)
        text(sl,f'BBL {r["BBL"]}   |   BROOKLYN   BLOCK {r["BBL"][1:6].lstrip("0")}   LOT {int(r["BBL"][6:])}',.54,1.14,11.6,.28,10,"#587484")
        text(sl,f'{i:02d} / {len(rows):02d}',11.95,.41,.88,.28,10,"#677F89",True)
        panels=[(.53,1.53,6.07,5.37,"land","LAND USE  |  MapPLUTO"),(6.79,1.53,6.0,2.6,"aerial","AERIAL  |  NYC OTI 2024"),(6.79,4.30,6.0,2.6,"street","STREET LEVEL  |  FRONTAGE")]
        for x,y,w,h,k,ttl in panels:
            rect(sl,x,y,w,h,"#F1F5F6")
            path=r.get(k+"_path")
            if path:
                sl.shapes.add_picture(str(path), Inches(x), Inches(y),width=Inches(w),height=Inches(h))
            else:
                text(sl,"PHOTO NOT VERIFIED" if k=="street" else "LAYER UNAVAILABLE",x+.42,y+.98,w-.7,.5,15,"#738894",True)
                if k=="street":text(sl,"Open Street View using the linked address below.",x+.4,y+1.5,w-.8,.32,11,"#738894")
            rect(sl,x+.02,y+.02,min(w-.05,3.6),.3,"#FFFFFF")
            text(sl,ttl,x+.13,y+.08,w-.26,.17,9,"#29485B",True)
        if r.get("street_path"):
            text(sl,"KartaView candidate; façade not independently verified",6.95,6.56,5.65,.24,8,"#FFF7EF")
        text(sl,"View exact BBL on ZoLa",.54,7.09,3.1,.22,9,"#0E6E9B",False,"https://zola.planning.nyc.gov/bbl/"+r["BBL"])
        text(sl,"Open Google Street View",4.12,7.09,3.3,.22,9,"#0E6E9B",False,"https://www.google.com/maps/search/?api=1&query="+quote(r["Address"]+", Brooklyn, NY"))
        text(sl,"GIS polygons: "+r["gis"]+"   |   Street image: "+r["street_status"][:35],7.25,7.08,5.55,.28,7.8,"#697D87")
    out=DEST/"Brooklyn_10_BBL_Site_Profiles.pptx";ppt.save(out);return out
def main():
    rows=[]
    try:
        fs=query({"where":"BBL IN ("+",".join(b for b,_ in SITES)+")","outFields":"BBL,Address,LandUse,ZoneDist1,LotArea,Latitude,Longitude","resultRecordCount":"100"})
        found={str(int(f["attributes"]["BBL"])):f for f in fs if f.get("geometry",{}).get("rings") and f.get("attributes",{}).get("BBL") is not None}
        print("PARCELS",len(found),list(found),flush=True)
    except Exception as e:
        print("QUERY_FATAL",str(e),flush=True);found={}
    for idx,(b,address) in enumerate(SITES,1):
        info={"Slide":idx,"BBL":b,"Address":address,"gis":"NOT RETRIEVED","aerial":"NOT RETRIEVED","land":"NOT RETRIEVED","street_status":"NOT RETRIEVED","street_path":None,"land_path":None,"aerial_path":None}
        f=found.get(b)
        if f:
            info["gis"]="AUTHENTIC MapPLUTO polygon"
            info["MapPLUTO_Address"]=f["attributes"].get("Address","")
            info["LandUse_Code"]=f["attributes"].get("LandUse","")
            info["Zoning"]=f["attributes"].get("ZoneDist1","")
            info["LotArea"]=f["attributes"].get("LotArea","")
            for k in ["land","aerial"]:
                try:
                    path,ok,n=render(f,idx,k,1120,980 if k=="land" else 540)
                    if ok:info[k+"_path"]=path;info[k]="TILES LOADED"
                    else:info[k]="NO TILES"
                except Exception as e:info[k]="ERROR "+str(e)[:80];print("RENDER_FAIL",b,k,e,flush=True)
            p,desc=street_photo(f,idx)
            info["street_path"]=p
            info["street_status"]=desc
        rows.append(info)
        print("DONE",idx,b,info["gis"],info["land"],info["aerial"],info["street_status"],flush=True)
    out=make_deck(rows)
    with (DEST/"Brooklyn_10_BBL_QA.csv").open("w",newline="",encoding="utf-8-sig") as fp:
        cols=["Slide","BBL","Address","MapPLUTO_Address","gis","land","aerial","street_status","LandUse_Code","Zoning","LotArea"]
        dw=csv.DictWriter(fp,fieldnames=cols,extrasaction="ignore");dw.writeheader();dw.writerows(rows)
    with (DEST/"Brooklyn_10_BBL_QA.json").open("w") as fp:
        json.dump([{k:(str(v) if isinstance(v,Path) else v) for k,v in d.items()} for d in rows],fp,indent=2)
    with (DEST/"README.txt").open("w") as fp:
        fp.write("Brooklyn 10 BBL site profiles\nPrepared using NYC DCP MapPLUTO polygons / NYC OTI 2024 orthophotos / KartaView where available.\n")
        fp.write("RED parcel boundaries always derive from public GIS geometry. No shapes are estimated by hand.\n")
        fp.write("KartaView street-level images are proximity+heading matches, NOT verified property frontage views. Open linked Google Street View for visual confirmation.\n")
        fp.write("Every failed layer explicitly noted in the QA CSV. Source dates reflect provider datasets, not today's conditions.\n")
    print("FINAL",out,flush=True)
if __name__=="__main__":main()
