"""Convert refined tank CSV paths to an importable MapTactic v2 vector group.

The shared transform fits all sorties inside 80% of the image, preserving X/Z
scale and relative placement. Original world coordinates remain in the group.
"""
import argparse
import csv
import json
from collections import defaultdict
from pathlib import Path

def export(csv_path, output, replay_id, player_id, map_name, team):
    routes=defaultdict(list)
    with csv_path.open(encoding='utf-8-sig',newline='') as handle:
        for row in csv.DictReader(handle):
            routes[row['sortie_id']].append({'x':float(row['x']),'y':float(row['z'])})
    points=[p for values in routes.values() for p in values]
    if not points: raise ValueError('No tank positions')
    loX=min(p['x'] for p in points); hiX=max(p['x'] for p in points)
    loZ=min(p['y'] for p in points); hiZ=max(p['y'] for p in points)
    scale=80/max(hiX-loX,hiZ-loZ,1)
    matrix=[scale,0,0,-scale,50-scale*(loX+hiX)/2,50+scale*(loZ+hiZ)/2]
    def projected(p): return {'x':scale*p['x']+matrix[4],'y':-scale*p['y']+matrix[5]}
    key=f'{map_name}::domination-1|{team}'
    markers=[];annotations=[];members=[]
    for index,(sortie,route) in enumerate(routes.items(),1):
        route_id=f'replay-{replay_id}-{player_id}-{sortie}'
        annotations.append({'id':route_id,'type':'route','points':[projected(p) for p in route]})
        members.append({'kind':'a','id':route_id,'original':{'points':route}})
        for endpoint,p in [('시작',route[0]),('종료',route[-1])]:
            marker_id=f'{route_id}-{"start" if endpoint=="시작" else "end"}'
            markers.append({'id':marker_id,'type':'mainBattleTank' if index==1 else 'mainBattleTankRed',**projected(p),'label':f'{index} {endpoint}'})
            members.append({'kind':'m','id':marker_id,'original':p.copy()})
    result={'version':2,'markers':{key:markers},'annotations':{key:annotations},'vectorGroups':{key:[{
        'id':f'replay-{replay_id}-{player_id}','name':f'{player_id} · tank routes','matrix':matrix,'members':members,
        'source':{'replayId':replay_id,'playerId':player_id,'map':map_name,'worldAxes':'original.x = world X; original.y = world Z','placement':'Uncalibrated; uniformly fitted to 80% of image','sorties':list(routes)}
    }]}}
    output.parent.mkdir(parents=True,exist_ok=True)
    output.write_text(json.dumps(result,ensure_ascii=False,separators=(',',':'),allow_nan=False),encoding='utf8')
    print(f'{len(points)} points, {len(markers)} endpoint markers; {output.stat().st_size:,} bytes: {output}')

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--csv',required=True,type=Path);p.add_argument('--out',required=True,type=Path)
    p.add_argument('--replay',required=True);p.add_argument('--player',required=True)
    p.add_argument('--map',default='Middle East');p.add_argument('--team',choices=['Red','Blue'],default='Red')
    a=p.parse_args();export(a.csv,a.out,a.replay,a.player,a.map,a.team)
