---
title: CSES Geometry
published: 2026-01-25
description: 先使用快速排斥实验,然后再判断一下另一条线段的两个端点是否在这条直线的两端,对于两条直线都需要判断一次(比如两条直线垂直但不相交的时候就会判断失误) 代码 一个是可以考虑把一个多边形划分为多个三角形,每个三角形的面积可以用叉积计算,最后加起来取abs 然后ai告诉我也可以这样算 ,注意第一个点和最后一个点也算相邻 代码
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

### 问题 B：Line Segment Intersection
先使用快速排斥实验,然后再判断一下另一条线段的两个端点是否在这条直线的两端,对于两条直线都需要判断一次(比如两条直线垂直但不相交的时候就会判断失误)
*代码*
```cpp

#include <bits/stdc++.h>

#define N 1000005

#define pr pair<ll,ll>

#define ll long long

#define inf 100000000000

using namespace std;

ll n,m,ans,x;

const ll mod=1e9+7;

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    cin>>n;

    auto check=[](pr a,pr b)->bool

    {

        if(max(a.first,a.second)<min(b.first,b.second)) return 1;

        swap(a,b);

        if(max(a.first,a.second)<min(b.first,b.second)) return 1;

        return 0;

    };    

    auto cal=[](pr a,pr b)

    {

        return a.first*b.second-a.second*b.first;

    };  

    auto sgn=[&](ll x)

    {

        if(!x) return 0;

        return x<0?-1:1;

    };

    while(n--)

    {

        ll x1,y1,x2,y2,x3,y3,x4,y4;

        cin>>x1>>y1>>x2>>y2>>x3>>y3>>x4>>y4;

        if(check({x1,x2},{x3,x4}) || check({y1,y2},{y3,y4}))

        {

            cout<<"NO\n";

        }

        else

        {

            if(sgn(cal({x2-x1,y2-y1},{x3-x1,y3-y1}))*sgn(cal({x2-x1,y2-y1},{x4-x1,y4-y1}))<=0 && sgn(cal({x4-x3,y4-y3},{x1-x3,y1-y3}))*sgn(cal({x4-x3,y4-y3},{x2-x3,y2-y3}))<=0)

            {

                cout<<"YES\n";

            }else cout<<"NO\n";

        }



    }

    return 0;

}
```
---
#### 问题 C：Polygon Area
一个是可以考虑把一个多边形划分为多个三角形,每个三角形的面积可以用叉积计算,最后加起来取abs
然后ai告诉我也可以这样算$S=\sum (x_y,y_i) \times (x_{i+1},y_{i+1})$,注意第一个点和最后一个点也算相邻
*代码*
```cpp
#include <algorithm>

#include <bits/stdc++.h>

#include <type_traits>

#include <unordered_map>

#include <utility>

#define N 1000005

#define pr pair<ll,ll>

#define ll long long

#define inf 100000000000

using namespace std;

ll n,m,ans,x;

const ll mod=1e9+7;

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    cin>>n;

    auto cal=[](pr a,pr b)

    {

        return a.first*b.second-a.second*b.first;

    };    

    ll x,y;

    ll prex,prey;

    for(int i=1;i<=n;i++)

    {

        ll a,b;

        cin>>a>>b;

        if(i==1)

        {

            x=a,y=b;

        }else if(i==2)

        {

            prex=a,prey=b;

        }else {

            ans+=(cal({a-x,b-y},{prex-x,prey-y}));

            prex=a,prey=b;

        }

    }

    cout<<abs(ans);

    return 0;

}
```
