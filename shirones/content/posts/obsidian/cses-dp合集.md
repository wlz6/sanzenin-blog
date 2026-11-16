---
title: CSES  DP合集
published: 2026-01-25
description: O：Removal Game 我们令 为在 区间先手能取得的最大收益,我们显然根据可以从以 和 区间转移过来.也算是一个trick,如果从最后一局倒序看一场游戏,最后一把为最后一个人先手开始游戏,然后倒数第二把可以看作另一个人先手开一把游戏然后另一个人再进行最后一把 代码
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

[O：Removal Game](https://vjudge.net/problem/CSES-1097)
###### 思路
我们令$f(i,j)$为在$(i,j)$区间先手能取得的最大收益,我们显然根据可以从以$(i+1,j)$和$(i,j-1)$区间转移过来.也算是一个trick,如果从最后一局倒序看一场游戏,最后一把为最后一个人先手开始游戏,然后倒数第二把可以看作另一个人先手开一把游戏然后另一个人再进行最后一把
*代码*
```cpp
#include <bits/stdc++.h>

#define N 1000005

#define pr pair<int,int>

#define ll long long

#define inf 100000000000

using namespace std;

ll n,m,ans;

const ll mod=1e9+7;

int main()

{

    ios::sync_with_stdio(0);

    cin.tie(nullptr);

    cout.tie(nullptr);

    cin>>n;

    vector<ll>s(n+5,0);

    vector<ll>pre(n+5,0);

    for(int i=1;i<=n;i++)

    {

        cin>>s[i];

        pre[i]=pre[i-1]+s[i];

    }

    vector<vector<ll>>dp(n+5,vector<ll>(n+5,-1e16));

    for(int i=1;i<=n;i++) dp[i][i]=s[i];

    for(int i=n;i>=1;i--)

    {

        int len=i;

        for(int j=i;j<=n;j++)

        {

            if(i==j) continue;

            dp[i][j]=max({dp[i][j],pre[j]-pre[i-1]-dp[i+1][j],pre[j]-pre[i-1]-dp[i][j-1]});

        }  

    }

    cout<<dp[1][n];

    return 0;

}
```
