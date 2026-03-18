#!/usr/bin/env python3
"""景點品質檢查腳本"""

import os
import json
import subprocess
from collections import defaultdict

# 檢查標準
MIN_LENGTH = 80
MAX_LENGTH = 150
FORBIDDEN_WORDS = ['熱門景點', '知名景點', '值得', '展現']
REQUIRED_ELEMENTS = {
    'visual': ['顏色', '景色', '建築', '色彩', '風景', '山', '海', '河', '湖', '塔', '橋', '牆'],
    'culture': ['歷史', '文化', '傳統', '王朝', '時期', '建於', '世紀', '年代', '遺產'],
    'practical': ['門票', '時間', '小時', '分鐘', '開放', '營業', '建議', '可搭配', '免費', '約']
}

def check_quality(attraction):
    """檢查單個景點品質"""
    name = attraction['name']
    desc = attraction['description']
    country = attraction.get('country_name', '未知')
    
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
    if '！' in desc or '超級' in desc or 'CP值' in desc.replace('CP值', ''):
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

def main():
    print("🔍 開始檢查景點品質...")
    
    # 查詢所有景點（使用 JSON 輸出更可靠）
    cmd = [
        'npx', 'supabase', 'db', 'query', '--linked',
        """SELECT json_agg(row_to_json(t)) FROM (
            SELECT 
                a.id, 
                a.name, 
                a.description, 
                c.name as country_name 
            FROM attractions a 
            LEFT JOIN countries c ON a.country_id = c.id 
            WHERE a.description IS NOT NULL 
            ORDER BY c.name, a.name
        ) t"""
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True, cwd=os.path.expanduser('~/Projects/venturo-erp'))
    
    if result.returncode != 0:
        print(f"❌ 資料庫查詢失敗: {result.stderr}")
        return
    
    # 解析輸出（去掉表格頭尾）
    lines = result.stdout.strip().split('\n')
    json_line = None
    for line in lines:
        line = line.strip()
        if line.startswith('[') and line.endswith(']'):
            json_line = line
            break
        elif line.startswith('['):
            # 可能是多行JSON
            json_line = '\n'.join(lines[lines.index(line):])
            break
    
    if not json_line:
        print(f"❌ 無法解析 JSON 輸出")
        return
    
    attractions = json.loads(json_line)
    
    print(f"📊 總共 {len(attractions)} 個景點")
    
    # 批次檢查
    results = []
    country_stats = defaultdict(lambda: {'total': 0, 'scores': []})
    score_dist = defaultdict(int)
    
    for i, attr in enumerate(attractions, 1):
        if i % 100 == 0:
            print(f"   已檢查 {i}/{len(attractions)}...")
        
        result = check_quality(attr)
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
        
        for r in poor:
            f.write(f'### {r["name"]} ({r["country"]}) - {r["score"]}分\n\n')
            f.write(f'**問題：**\n')
            for issue in r['issues']:
                f.write(f'- {issue}\n')
            f.write(f'\n**現有描述：** {r["description"][:100]}...\n\n')
            f.write('---\n\n')
        
        # 範例（5分景點）
        f.write('## 範例（5分景點）\n\n')
        excellent = [r for r in results if r['score'] == 5][:10]
        
        for r in excellent:
            f.write(f'### {r["name"]} ({r["country"]})\n\n')
            f.write(f'{r["description"]}\n\n')
            f.write(f'*長度：{r["length"]}字*\n\n')
            f.write('---\n\n')
        
        # 範例（需改進）
        f.write('## 範例（需改進 - 1-2分）\n\n')
        needs_work = [r for r in results if r['score'] <= 2][:10]
        
        for r in needs_work:
            f.write(f'### {r["name"]} ({r["country"]}) - {r["score"]}分\n\n')
            f.write(f'**問題：** {", ".join(r["issues"])}\n\n')
            f.write(f'{r["description"]}\n\n')
            f.write('---\n\n')
    
    print(f"\n✅ 報告已產出：{report_path}")
    print(f"📊 總景點：{total}")
    print(f"⭐ 平均分數：{avg_score:.2f}/5.0")
    print(f"🎯 5分景點：{score_dist[5]} ({score_dist[5]/total*100:.1f}%)")
    print(f"⚠️  需改進(≤2分)：{score_dist[1] + score_dist[2]} ({(score_dist[1]+score_dist[2])/total*100:.1f}%)")

if __name__ == '__main__':
    main()
