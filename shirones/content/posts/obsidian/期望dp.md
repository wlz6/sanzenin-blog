---
title: 期望DP
published: 2026-09-03
description: Niuniu 喜欢玩 OSU!。将该游戏简化为如下问题： 给定两个整数 ，接下来有 次点击，每次点击可能成功也可能失败。若一段连续成功的长度（连击长度）为 ，则该段贡献 分。第 次点击成功的概率为 。求总得分的期望值，结果对 取模。 输入 - 第一行两个整数 。 - 第二行 个整数 。 数据范围 样例输入 样例输出 1
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

## 题目重述

Niuniu 喜欢玩 OSU!。将该游戏简化为如下问题：

给定两个整数 $n,m$，接下来有 $n$ 次点击，每次点击可能成功也可能失败。若一段连续成功的长度（连击长度）为 $X$，则该段贡献 $X^m$ 分。第 $i$ 次点击成功的概率为 $\dfrac{p_i}{100}$。求总得分的期望值，结果对 $10^9+7$ 取模。

**输入**
- 第一行两个整数 $n,m$。
- 第二行 $n$ 个整数 $p_1,\dots,p_n$。

**数据范围**
$$1\le n\le 1000,\quad 1\le m\le 1000,\quad 0\le p_i\le 100.$$

**样例输入**
```text
3 4
50 50 50
```

**样例输出**
```text
750000020
```

## 关键观察

1. **总得分可分解为若干极大成功段的贡献**。一次具体的点击过程会被失败位置与结尾划分成若干段极大的连续成功段，每段长度 $L$ 对答案的贡献为 $L^m$。
2. **期望具有线性性**。一段长度为 $j$ 的连击是否产生 $j^m$ 的贡献，只取决于该段对应的 $j$ 个位置全成功、且其前一个位置失败（或为开头）这一事件的概率。
3. **正推与倒推的数学区别**。正推维护的是“绝对期望”，每次新增得分都要乘以“到达当前状态的概率”；倒推维护的是“条件期望”，利用全期望公式
   $$E[X\mid i]=\sum_j P(i\to j)\big(W(i\to j)+E[X\mid j]\big),$$
   可以彻底消去历史路径概率，转移只依赖当前一步的概率。

## 解析

### 解法一：倒推 DP

定义 $dp[i][j]$ 为：已经完成前 $i-1$ 次点击，当前连击长度为 $j$，从第 $i$ 次点击开始进行到第 $n$ 次点击的期望后续得分。

第 $i$ 次点击有两种可能：

- **失败**，概率 $1-p_i$：当前连击 $j$ 被结算，获得 $j^m$ 分，连击清零，后续期望为 $dp[i+1][0]$。
- **成功**，概率 $p_i$：连击长度变为 $j+1$，本次不得分，后续期望为 $dp[i+1][j+1]$。

由全期望公式得到转移方程：
$$dp[i][j]=(1-p_i)\big(j^m+dp[i+1][0]\big)+p_i\cdot dp[i+1][j+1].$$

边界条件：所有点击结束后，剩余连击直接结算，因此
$$dp[n+1][j]=j^m.$$

最终答案为 $dp[1][0]$。

状态数为 $O(n^2)$，每个状态 $O(1)$ 转移，时间复杂度 $O(n^2)$，空间复杂度 $O(n^2)$。

### 解法二：正推 DP

定义 $dp[i][j]$ 为：前 $i$ 次点击中，末尾连续成功的长度恰好为 $j$ 的所有情况下的“得分 $\times$ 概率”之和。

- **$j\ge 1$ 的转移**：第 $i$ 步结尾形成一个长度恰好为 $j$ 的连击，当且仅当第 $i-j$ 步失败（$i=j$ 时视为虚拟失败，即从头开始），且第 $i-j+1,\dots,i$ 步连续成功。该段贡献 $j^m$ 分，因此
  $$dp[i][j]=\Big(dp[i-j][0]+j^m\cdot(1-p_{i-j})\Big)\cdot\prod_{k=i-j+1}^{i}p_k.$$
- **$j=0$ 的转移**：第 $i$ 步失败，连击清零，无新增得分，继承前一步所有状态：
  $$dp[i][0]=\sum_{j=0}^{i-1}dp[i-1][j]\cdot(1-p_i).$$

最终答案为
$$\sum_{j=0}^{n}dp[n][j].$$

复杂度同样为 $O(n^2)$。

## 代码

### 倒推实现

```cpp
#include <bits/stdc++.h>
#include <iomanip>
#include <utility>
#define ll long long
#define N 200005
using namespace std;
ll ans;
ll n, m, k;
ll t;
ll mod = 1e9 + 7;
#define pr pair<ll, ll>
int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);
    cin >> n >> m;
    auto qp = [&](ll x, ll k) {
        ll res = 1;
        while (k) {
            if (k & 1)
                res = (res * x) % mod;
            x = (x * x) % mod;
            k >>= 1;
        }
        return res;
    };
    auto inv = qp(100, mod - 2);
    vector<ll> p(n + 5, 0);
    for (int i = 1; i <= n; i++)
        cin >> p[i], p[i] = p[i] * inv % mod;
    vector<vector<ll>> dp(n + 5, vector<ll>(n + 5, 0));
    for (int i = 1; i <= n; i++)
        dp[n + 1][i] = qp(i, m);
    for (int i = n; i >= 1; i--) {
        for (int j = i - 1; j >= 0; j--) {
            dp[i][j] = ((1 - p[i] + mod) % mod * (qp(j, m) + dp[i + 1][0]) +
                        p[i] * dp[i + 1][j + 1] % mod) %
                       mod;
        }
    }
    cout << dp[1][0];
    return 0;
}
```

### 正推实现

```cpp
#include <bits/stdc++.h>
#include <iomanip>
#include <utility>
#define ll long long
#define N 200005
using namespace std;
ll ans;
ll n, m, k;
ll t;
ll mod = 1e9 + 7;
#define pr pair<ll, ll>
int main() {
    ios::sync_with_stdio(0);
    cin.tie(0);
    cout.tie(0);
    cin >> n >> m;
    auto qp = [&](ll x, ll k) {
        ll res = 1;
        while (k) {
            if (k & 1)
                res = (res * x) % mod;
            x = (x * x) % mod;
            k >>= 1;
        }
        return res;
    };
    auto inv = qp(100, mod - 2);
    vector<ll> p(n + 5, 0);
    for (int i = 1; i <= n; i++)
        cin >> p[i];
    vector<vector<ll>> dp(n + 5, vector<ll>(n + 5, 0));
    vector<vector<ll>> pre(n + 5, vector<ll>(n + 5, 0));
    for (int i = 1; i <= n; i++) {
        pre[i][i - 1] = 1;
        for (int j = i; j <= n; j++) {
            pre[i][j] = pre[i][j - 1] * p[j] % mod * inv % mod;
        }
    }
    for (int i = 1; i <= n; i++) {
        for (int j = 1; j <= i; j++) {
            ll now_p;
            now_p = pre[i - j + 1][i];
            dp[i][j] = (dp[i][j] + (dp[i - j][0] + qp(j, m) * (100 - p[i - j]) % mod * inv % mod) %
                                       mod * now_p % mod) %
                       mod;
        }
        for (int j = 0; j < i; j++)
            dp[i][0] = (dp[i][0] + dp[i - 1][j] * (100 - p[i]) % mod * inv % mod) % mod;
    }
    ll res = 0;
    for (int i = 0; i <= n; i++)
        res = (res + dp[n][i]) % mod;
    cout << res;
    return 0;
}
```
