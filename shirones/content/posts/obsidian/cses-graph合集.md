---
title: 问题 T：Planets Queries II
published: 2026-01-22
description: 直接用floyed跑全源最短路显然会超时.注意到本题的图是一颗基环树森林,因此可以分类讨论,尝试将最值问题转换为判定问题.我们先用tarjan预处理出所有环,再求出所有结点最近的环上的点以及到这个点的距离. - 当a,b均不在环上,当且仅当b是a的祖先可以到达,我们求出a,b之间的距离,如果a向上走这些距离走到b,那么
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# 问题 T：Planets Queries II
### 思路
直接用floyed跑全源最短路显然会超时.注意到本题的图是一颗基环树森林,因此可以分类讨论,尝试将最值问题转换为判定问题.我们先用tarjan预处理出所有环,再求出所有结点最近的环上的点以及到这个点的距离.

-  当a,b均不在环上,当且仅当b是a的祖先可以到达,我们求出a,b之间的距离,如果a向上走这些距离走到b,那么ans就是dis[a]-dis[b].判定过程可以使用倍增优化.
- 当a,b均在环上,直接求出两者之间距离
- 当a在树上,b在环上,让a跳到离a最近的环上祖先,转换为第二种情况.
<small>*处理环也可以用拓扑排序</small>

*代码*
```cpp
#include <bits/stdc++.h>

#include <iterator>

#include <queue>

#include <set>

#include <unordered_map>

#define N 100005

#define inf 0x3f3f3f3f3f3f3f3f

#define ll long long

#define pr pair<ll,ll>

using namespace std;

int n,m,q;

vector<vector<int>>map1;

vector<vector<int>>fa;

vector<vector<int>>ring;



vector<ll>scc;

vector<ll>siz;

vector<ll>dis;

vector<ll>ancestor;

vector<ll>priority;



const ll mod=1e9+7;

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    cin>>n>>q;



    map1.assign(n+5,{});      

    ring.assign(n+5,{});      

    fa.assign(n+5,vector<int>(30,0));      

    scc.assign(n+5,0);

    priority.assign(n+5,0);

    ancestor.assign(n+5,0); //在环上的祖先

    siz.assign(n+5,0);

    dis.assign(n+5,0);

    for(int i=1;i<=n;i++)

    {

        ll x;

        cin>>x;

        fa[i][0]=x;

        map1[i].push_back(x);

    }

    for(int j=1;j<=25;j++)

    {

        for(int i=1;i<=n;i++)

        {

            fa[i][j]=fa[fa[i][j-1]][j-1];

        }

    }

    auto tarjan=[&]()

    {

        int tim=0;

        stack<int>st;

        vector<ll>dfn(n+5,0);vector<ll>low(n+5,0);

        vector<bool>insta(n+5,0);



        auto dfs=[&](auto &&self,int x)->void

        {

            dfn[x]=low[x]=++tim;

            st.push(x);

            insta[x]=1;

            for(auto v:map1[x])

            {

                if(!dfn[v])

                {

                    self(self,v);

                    low[x]=min(low[x],low[v]);

                }else if(insta[v])

                {

                    low[x]=min(low[x],dfn[v]);

                }

            }

            if(low[x]==dfn[x])

            {

                int y=-1;

                while(y!=x)

                {

                    y=st.top(),st.pop();

                    insta[y]=0;

                    scc[y]=x,ring[x].push_back(y);

                    priority[y]=(++siz[scc[y]]);

                }

            }

        };

        auto dfs2=[&](auto &&self,int x)->void

        {

            if(ancestor[x]) return ;

            auto v=map1[x][0];

            self(self,v);

            ancestor[x]=ancestor[v];

            dis[x]=dis[v]+1;

        };

        for(int i=1;i<=n;i++)

        {

            if(!dfn[i]) dfs(dfs,i);

        }

        for(int i=1;i<=n;i++)

        {

            if(map1[i][0]==i) ancestor[i]=i;

            else if(ring[i].size()>1)

            {

                for(auto x:ring[i]) ancestor[x]=x;

            }

        }

        for(int i=1;i<=n;i++) dfs2(dfs2,i);

    };

    auto query=[&](int a,int b)

    {

        auto query=[&](int x,int k)

        {

            if(k<=0) return x;

            for(int i=25;i>=0;i--)

            {

                if((k>>i)&1)

                {

                    x=fa[x][i];

                }

            }

            return x;

        };

        int ans=-1;

        if(scc[ancestor[a]]!=scc[ancestor[b]]) return -1;

        if(ancestor[a]==a && ancestor[b]!=b) return -1; //a在环上 b在树上

        else if(ancestor[a]!=a && ancestor[b]!=b) //都在树上

        {

            ans=dis[a]-dis[b];

            if(query(a, ans)==b) return ans;

            else return -1;

        }

        else

        {

            ans=dis[a]-dis[ancestor[a]];

            a=ancestor[a];

            ll tem=(priority[a]-priority[b]+siz[scc[a]])%siz[scc[a]];

            ans+=tem;

            return ans;

        }

    };

    tarjan();

    while(q--)

    {

        ll a,b;

        cin>>a>>b;

        cout<<query(a, b)<<'\n';

    }



    return 0;

}
```
---
# 问题 U：Planets Cycles
### 思路
类似于上一题,找每个点最近的环,距离就是到环的距离+环大小

*代码*
```cpp
#include <bits/stdc++.h>

#include <iterator>

#include <queue>

#include <set>

#include <unordered_map>

#define N 100005

#define inf 0x3f3f3f3f3f3f3f3f

#define ll long long

#define pr pair<ll,ll>

using namespace std;

int n,m,q;

vector<vector<int>>map1;



vector<ll>scc;

vector<ll>din;

vector<ll>siz;

vector<ll>dis;

vector<ll>ancestor;

vector<ll>priority;



const ll mod=1e9+7;

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    cin>>n;



    map1.assign(n+5,{});      

    scc.assign(n+5,0);

    priority.assign(n+5,0);

    ancestor.assign(n+5,0); //在环上的祖先

    siz.assign(n+5,0);

    dis.assign(n+5,0);

    din.assign(n+5,0);

    for(int i=1;i<=n;i++)

    {

        ll x;

        cin>>x;

        map1[i].push_back(x);

        din[x]++;

    }



    auto toop=[&]()

    {

        queue<int>q;

        for(int i=1;i<=n;i++)

        {

            if(!din[i]) q.push(i);

        }

        while(q.size())

        {

            auto x=q.front();

            q.pop();

            for(auto v:map1[x])

            {

                if(!(--din[v])) q.push(v);

            }

        }

    };

    auto init=[&]()

    {

        toop();

        auto dfs=[&](auto &&self,int x,int fa)

        {

            if(ancestor[x]) return ;

            ancestor[x]=x;

            scc[x]=fa;

            siz[fa]++;

            self(self,map1[x][0],fa);

        };  

        auto dfs2=[&](auto &&self,int x)->void

        {

            if(ancestor[x]) return ;

            auto v=map1[x][0];

            self(self,v);

            ancestor[x]=ancestor[v];

            dis[x]=dis[v]+1;

        };

        for(int i=1;i<=n;i++)

        {

            if(din[i] && !ancestor[i]) dfs(dfs,i,i);

        }  

        for(int i=1;i<=n;i++)

        {

            if(!ancestor[i]) dfs2(dfs2,i);

        }

    };

    init();

    for(int i=1;i<=n;i++)

    {

        cout<<dis[i]+siz[scc[ancestor[i]]]<<' ';

    }



    return 0;

}
```
---
[ AF：Knight's Tour]()
剪枝优化,按照出度从小到大排序,从贪心来看就是先把难走的走完,最后走好走的

```cpp
#include <algorithm>

#include <bits/stdc++.h>

#include <iterator>

#include <queue>

#include <set>

#include <unordered_map>

#define N 100005

#define inf 0x3f3f3f3f3f3f3f3f

#define ll long long

#define pr pair<int,int>

using namespace std;

int n,m,q,ma,ans,x,y;

vector<vector<pr>>map1;

const ll mod=1e9+7;

int vis[20][20];

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    n=8;

    pr mv[8]={{2,1},{-2,1},{2,-1},{-2,-1},{1,2},{1,-2},{-1,2},{-1,-2}};

    auto check=[&](int x,int y)

    {

        if(vis[x][y] || x<1 || y<1 || y>n || x>n) return 0;

        return 1;

    };

    auto cal=[&](int x,int y)

    {

        int tem=0;

        for(auto [dx,dy]:mv)

        {

            auto xx=x+dx;

            auto yy=y+dy;

            if(!check(xx,yy)) continue;

            tem++;

        }

        return tem;

    };

    auto dfs=[&](auto &&self,int x,int y,int cnt)->bool

    {

        vis[x][y]=cnt;

        if(cnt==64)

        {

            return 1;

        }

        vector<tuple<int,int,int>>tem;

        for(auto [dx,dy]:mv)

        {

            auto xx=x+dx;

            auto yy=y+dy;

            if(!check(xx, yy)) continue;

            tem.push_back({cal(xx,yy),xx,yy});

        }

        sort(tem.begin(),tem.end());

        for(auto [_,xx,yy]:tem)

        {

            if(self(self,xx,yy,cnt+1))

            {

                return 1;

            }

        }

        vis[x][y]=0;

        return 0;

    };

    cin>>y>>x;

    dfs(dfs,x,y,1);

    for(int i=1;i<=n;i++ && cout<<'\n')

    {

        for(int j=1;j<=n;j++)

        {

            cout<<vis[i][j]<<' ';

        }

    }
    return 0;

}
```
