"""把 data/database.xlsx 轉成 app/data/attractions.json，並做基本檢查。
用法：python scripts/export.py
"""
import json, re, sys, datetime, pathlib
import openpyxl

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / 'data' / 'database.xlsx'
OUT = ROOT / 'app' / 'data' / 'attractions.json'

def num(v):
    return v if isinstance(v, (int, float)) and not isinstance(v, bool) else None

def category(name, typ):
    s = f'{name} {typ}'
    rules = [
        ('主題樂園', r'樂園|遊樂|樂世界|夢想|渡假村|探索樂|纜車|摩天輪|飛行劇院'),
        ('觀光工廠', r'觀光工廠|工廠|酒廠|故事館|知識館|產業文化館|見學|體驗館|夢工場'),
        ('休閒農場牧場', r'農場|牧場|農園|莊園|花田|園藝|茶廠'),
        ('森林與自然', r'森林遊樂區|國家公園|風景區|地質公園|自然|生態|步道|瀑布|濕地|海灘|海水浴場|潮間帶|水庫|吊橋|湖'),
        ('博物館美術館', r'博物館|美術館|文化館|紀念館|文物館|藝術|展示|科學|教育館|水族館|海洋館|動物園|天文|館'),
        ('古蹟歷史', r'古蹟|故居|官邸|行館|砲台|礮臺|坑道|據點|堡|城|宿舍|賓館|園邸|書屋|廟|寺|宮'),
    ]
    for c, p in rules:
        if re.search(p, s):
            return c
    return '其他'

def source_level(stype, verify):
    st = str(stype)
    if re.search('政府|機關|縣府|市府|官方清單|開放資料|法規|公告|風景區管理處|文化部|觀光網|旅遊網', st):
        return '政府資料'
    if '使用者' in st or '使用者截圖' in str(verify):
        return '使用者截圖'
    if re.search('官網|官方網站|業者|官方', st):
        return '業者官方'
    return '第三方'

def d_kind(full, allfree, dtype, dprice):
    if str(allfree).startswith('是'):
        return '全民免費'
    if dprice == 0:
        return '免費'
    if dprice is None:
        return '待確認'
    if full and abs(dprice * 2 - full) <= 1 or '半' in str(dtype):
        return '半價'
    return '優待'

def c_kind(ctype, cprice, ccount, full):
    t = str(ctype or '')
    if not ccount or re.search('無優惠|不適用|未列|待複核|未載', t):
        return '無' if '待複核' not in t else '待確認'
    if cprice == 0:
        return '免費'
    if cprice is None:
        return '待確認'
    return '優惠'

def main():
    wb = openpyxl.load_workbook(SRC, read_only=True)
    s1 = {r[0]: r for r in wb['01_景點主資料'].iter_rows(min_row=2, values_only=True) if r[0]}
    s3 = {r[0]: r for r in wb['03_票價與優惠明細'].iter_rows(min_row=2, values_only=True) if r[0]}
    s2 = {r[4]: r for r in wb['02_來源母表'].iter_rows(min_row=2, values_only=True) if r[0]}
    errors, items = [], []
    for aid, a in s1.items():
        p = s3.get(aid)
        if not p:
            errors.append(f'{aid} 缺 03 票價資料'); continue
        full, dp, cp = num(p[2]), num(p[5]), num(p[7])
        if full is not None and dp is not None and dp > full:
            errors.append(f'{aid} 身障價高於全票')
        if full is not None and cp is not None and cp > full:
            errors.append(f'{aid} 陪同價高於全票')
        cc = num(p[8])
        src = s2.get(aid, [None] * 8)
        status = str(a[9] or '')
        items.append({
            'id': aid, 'county': a[3], 'name': a[4], 'type': a[5],
            'cat': category(a[4], a[5]),
            'addr': (a[6] or '').strip(), 'tel': a[7] or '', 'web': a[8] or '',
            'status': status, 'closed': bool(re.search('暫停|休館|休園|停業', status)),
            'full': full, 'fullText': None if full is not None else (p[2] or ''),
            'allFree': str(p[3]).startswith('是'),
            'dType': p[4] or '', 'dPrice': dp, 'dKind': d_kind(full, p[3], p[4], dp),
            'cType': p[6] or '', 'cPrice': cp, 'cCount': int(cc) if cc else 0,
            'cKind': c_kind(p[6], cp, cc, full),
            'doc': p[9] or '', 'remark': p[10] or '',
            'src': p[11] or '', 'srcUrl': p[12] or '', 'date': str(p[13] or ''),
            'verify': p[14] or '', 'level': source_level(src[1], p[14]),
        })
    names = [i['name'] for i in items]
    dup = {n for n in names if names.count(n) > 1}
    if dup:
        errors.append(f'重名：{dup}')
    if errors:
        print('檢查未通過：'); print('\n'.join(errors)); sys.exit(1)
    items.sort(key=lambda x: (x['county'] or '', x['name'] or ''))
    meta = {'count': len(items), 'generated': datetime.date.today().isoformat(),
            'paid': sum(1 for i in items if not i['allFree'])}
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps({'meta': meta, 'items': items}, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print(f"輸出 {len(items)} 筆（收費景點 {meta['paid']} 筆）→ {OUT.relative_to(ROOT)}")

if __name__ == '__main__':
    main()
