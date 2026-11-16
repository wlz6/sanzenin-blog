---
title: Pick定理
published: 2026-09-03
description: 平面上简单多边形的面积S,其内部位于整数坐标点上点数目I,以及在边上的整点书目b,满足 1. 首先证明可加性.由假设有两个多边形 均满足Pick定理.且两个多边形有一条公共边,公共边上的点为 .我们设 .由假设得合并后多边形的内部点 ,边界点 ,带入Pick公式得 2. 首先易证得平面上的矩形都满足Pick定理,由可加
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

### Pick定理
平面上简单多边形的面积S,其内部位于整数坐标点上点数目I,以及在边上的整点书目b,满足$$S=I+\frac{b}{2}-1$$
### 证明(不是那么严谨)

1. 首先证明可加性.由假设有两个多边形$A_1,A_2$均满足Pick定理.且两个多边形有一条公共边,公共边上的点为$k$.我们设$A=A_1 \bigcup A_2$.由假设得合并后多边形的内部点$I=I_1+I_2+k-2$,边界点$b=b_1+b_2-2*k+2$,带入Pick公式得$$S_1+S_2=I_1+\frac{b_1}{2}-1+I_2+\frac{b_2}{2}-1=(I_1+I_2+k-2)+\frac{b_1+b_2-2*k+2}{2}-1=S$$
2. 首先易证得平面上的矩形都满足Pick定理,由可加性可得矩形的一半即直角三角形也满足Pick定理,任意三角形均可以通过矩形去掉若干直角三角形得到,则任意三角形也满足Pick定理,那么任意多边形均能划分为若干三角形,也满足Pick定理


---
[CSES Polygon Lattice Points](https://cses.fi/problemset/task/2193/)
*代码*
```cpp
#include <algorithm>
#include <bits/stdc++.h>
#define N 1000005
#define pr pair<ll, ll>
#define ll long long
#define inf 100000000000
using namespace std;
ll n, m, ans, x;
const ll mod = 1e9 + 7;
class Point {
  public:
    ll x = 0, y = 0;
    ll operator*(const Point &oth) const { return x * oth.x + y * oth.y; }
    ll mul(const Point &oth) const { return x * oth.y - y * oth.x; }
    Point operator+(const Point &oth) const { return {x + oth.x, y + oth.y}; }
    Point operator-(const Point &oth) { return {x - oth.x, y - oth.y}; }
};
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    cin >> n;
    vector<Point> s;
    for (int i = 1; i <= n; i++) {
        ll x, y;
        cin >> x >> y;
        s.push_back({x, y});
    }
    ll res1 = 0;
    ll res2 = 0;
    for (int i = 0; i < n; i++) {
        res1 += s[i].mul(s[(i - 1 + n) % n]);
        auto x = s[i] - s[(i - 1 + n) % n];
        res2 += gcd(abs(x.x), abs(x.y));
    }
    cout << (abs(res1) - res2 + 2) / 2 << ' ' << res2;
    return 0;
}
```
