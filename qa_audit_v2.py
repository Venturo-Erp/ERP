#!/usr/bin/env python3
"""景點品質檢查腳本 v2 - 直接讀取資料庫"""

import os
import re
from collections import defaultdict
import subprocess

# 檢查標準
MIN_LENGTH = 80
MAX_LENGTH = 150
FORBIDDEN_WORDS = ['熱門景點', '知名景點', '值得', '展現']
REQUIRED_ELEMENTS = {
    'visual': ['顏色', '景色', '建築', '色彩', '風景', '山', '海', '河', '湖', '塔', '橋', '牆', '白', '藍', '金', '紅', '綠'],
    'culture': ['歷史', '文化', '傳統', '王朝', '時期', '建於', '世紀', '年代', '遺產', 'UNESCO'],
    'practical': ['門票', '時間', '小時', '分鐘', '開放', '營業', '建議', '可搭配', '免費', '約', '馬幣', '元', '披索', '盾']
}

def check_quality(name, desc, country):
    """檢查單個景點品質"""
    score = 5  # 預設最高分
    issues = []
    
    # 1. 檢查長度
    length = len(desc)
    if length < MIN_LENGTH:
        score = min(score, 1)
        issues.append(f'太短（{length}字，需≥80字）')
    elif length > MAX_LENGTH + 20:  # 允許稍微超過
        score = min(score, 2)
        issues.append(f'稍長（{length}字，建議≤150字）')
    
    # 2. 檢查禁用詞
    for word in FORBIDDEN_WORDS:
        if word in desc:
            score = min(score, 1)
            issues.append(f'含禁用詞「{word}」')
    
    # 3. 檢查必備元素
    has_visual = any(kw in desc for kw in REQUIRED_ELEMENTS['visual'])
    has_culture = any(kw in desc for kw in REQUIRED_ELEMENTS['culture'])
    has_practical = any(kw in desc for kw in REQUIRED_ELEMENTS['practical'])
    
    missing_elements = []
    if not has_visual:
        missing_elements.append('視覺意象')
    if not has_culture:
        missing_elements.append('文化/歷史背景')
    if not has_practical:
        missing_elements.append('實用資訊')
    
    if missing_elements:
        score = min(score, 2)
        issues.append(f'缺少: {", ".join(missing_elements)}')
    
    # 4. 評估語言風格（簡單檢查）
    if '！' in desc or '超級' in desc:
        score = min(score, 3)
        issues.append('語氣較口語化')
    
    # 最終分數調整
    if length >= MIN_LENGTH and length <= MAX_LENGTH + 20 and not issues:
        score = 5  # 完美
    elif length >= MIN_LENGTH and not any('禁用詞' in i for i in issues):
        if len(missing_elements) == 0:
            score = max(score, 4)  # 優良
        elif len(missing_elements) == 1:
            score = min(score, 3)  # 合格
    
    return {
        'name': name,
        'country': country,
        'description': desc,
        'length': length,
        'score': score,
        'issues': issues
    }

def parse_table_output(output):
    """解析資料庫表格輸出"""
    lines = output.strip().split('\n')
    
    # 找到分隔線（────）
    separator_idx = -1
    for i, line in enumerate(lines):
        if '─' in line and '┼' in line:
            separator_idx = i
            break
    
    if separator_idx == -1:
        return []
    
    # 解析資料行
    data = []
    for line in lines[separator_idx+1:]:
        if '└' in line or not line.strip():
            break
        
        # 簡單解析表格（用 │ 分割）
        parts = [p.strip() for p in line.split('│')[1:-1]]  # 去掉最前和最後的空白
        
        if len(parts) >= 4:
            data.append({
                'id': parts[0],
                'name': parts[1],
                'description': parts[2],
                'country_name': parts[3]
            })
    
    return data

def main():
    print("🔍 開始檢查景點品質...")
    
    # 分批查詢（避免輸出過大）
    batch_size = 500
    offset = 0
    all_attractions = []
    
    while True:
        cmd = [
            'npx', 'supabase', 'db', 'query', '--linked',
            f"""SELECT 
                a.id::text, 
                a.name, 
                a.description, 
                COALESCE(c.name, '未知') as country_name 
            FROM attractions a 
            LEFT JOIN countries c ON a.country_id = c.id 
            WHERE a.description IS NOT NULL 
            ORDER BY c.name, a.name 
            LIMIT {batch_size} OFFSET {offset}"""
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.expanduser('~/Projects/venturo-erp'))
        
        if result.returncode != 0:
            print(f"❌ 資料庫查詢失敗: {result.stderr}")
            break
        
        batch = parse_table_output(result.stdout)
        
        if not batch:
            break
        
        all_attractions.extend(batch)
        print(f"   已載入 {len(all_attractions)} 個景點...")
        
        if len(batch) < batch_size:
            break
        
        offset += batch_size
    
    print(f"📊 總共 {len(all_attractions)} 個景點")
    
    if not all_attractions:
        print("❌ 沒有載入任何資料")
        return
    
    # 批次檢查
    results = []
    country_stats = defaultdict(lambda: {'total': 0, 'scores': []})
    score_dist = defaultdict(int)
    
    for i, attr in enumerate(all_attractions, 1):
        if i % 100 == 0:
            print(f"   已檢查 {i}/{len(all_attractions)}...")
        
        result = check_quality(attr['name'], attr['description'], attr['country_name'])
        results.append(result)
        
        country = result['country']
        score = result['score']
        
        country_stats[country]['total'] += 1
        country_stats[country]['scores'].append(score)
        score_dist[score] += 1
    
    # 計算統計
    total = len(results)
    avg_score = sum(r['score'] for r in results) / total if total > 0 else 0
    
    # 產出報告
    report_path = os.path.expanduser('~/Projects/venturo-erp/QA_REPORT_20260318.md')
    
    with open(report_path, 'w', encoding='utf-8') as f:
        f.write('# 景點品質檢查報告（2026-03-18 08:54）\n\n')
        
        # 總覽
        f.write('## 總覽\n\n')
        f.write(f'- 總景點數：{total:,}\n')
        f.write(f'- 平均分數：{avg_score:.2f} / 5.0\n')
        for score in range(5, 0, -1):
            count = score_dist[score]
            pct = (count / total * 100) if total > 0 else 0
            f.write(f'- {score}分景點：{count:,} ({pct:.1f}%)\n')
        f.write('\n')
        
        # 各國表現
        f.write('## 各國表現\n\n')
        f.write('| 國家 | 景點數 | 平均分 | 5分占比 | 問題數(≤2分) |\n')
        f.write('|------|--------|--------|---------|-------------|\n')
        
        for country, stats in sorted(country_stats.items()):
            total_c = stats['total']
            scores = stats['scores']
            avg_c = sum(scores) / len(scores) if scores else 0
            five_star = sum(1 for s in scores if s == 5)
            five_pct = (five_star / total_c * 100) if total_c > 0 else 0
            problems = sum(1 for s in scores if s <= 2)
            f.write(f'| {country} | {total_c:,} | {avg_c:.2f} | {five_pct:.1f}% | {problems} |\n')
        f.write('\n')
        
        # 需改進景點（2分以下）
        f.write('## 需改進景點（2分以下）\n\n')
        poor = [r for r in results if r['score'] <= 2]
        poor = sorted(poor, key=lambda x: x['score'])[:50]  # 取前50個
        
        for i, r in enumerate(poor, 1):
            f.write(f'{i}. **{r["name"]}** ({r["country"]}) - {r["score"]}分\n')
            f.write(f'   - 問題：{", ".join(r["issues"])}\n')
            f.write(f'   - 描述：{r["description"][:100]}...\n\n')
        
        # 範例（5分景點）
        f.write('## 範例（5分景點）\n\n')
        excellent = [r for r in results if r['score'] == 5][:10]
        
        for i, r in enumerate(excellent, 1):
            f.write(f'{i}. **{r["name"]}** ({r["country"]}) - 長度{r["length"]}字\n\n')
            f.write(f'   > {r["description"]}\n\n')
        
        # 範例（需改進）
        f.write('## 範例（需改進 - 1-2分）\n\n')
        needs_work = [r for r in results if r['score'] <= 2][:10]
        
        for i, r in enumerate(needs_work, 1):
            f.write(f'{i}. **{r["name"]}** ({r["country"]}) - {r["score"]}分\n')
            f.write(f'   - **問題：** {", ".join(r["issues"])}\n')
            f.write(f'   - **描述：** {r["description"]}\n\n')
    
    print(f"\n✅ 報告已產出：{report_path}")
    print(f"📊 總景點：{total:,}")
    print(f"⭐ 平均分數：{avg_score:.2f}/5.0")
    print(f"🎯 5分景點：{score_dist[5]:,} ({score_dist[5]/total*100:.1f}%)")
    print(f"👍 4分景點：{score_dist[4]:,} ({score_dist[4]/total*100:.1f}%)")
    print(f"⚠️  需改進(≤2分)：{score_dist[1] + score_dist[2]:,} ({(score_dist[1]+score_dist[2])/total*100:.1f}%)")

if __name__ == '__main__':
    main()
