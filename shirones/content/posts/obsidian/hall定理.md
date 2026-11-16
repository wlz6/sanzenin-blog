---
title: Hall 婚姻定理 (Hall's Marriage Theorem)
published: 2026-09-03
description: 设二分图 ， 。 中存在包含 中所有顶点的完全匹配（即最大匹配为 ）的充要条件是： 对于 的任意子集 ，其在 中的邻域集合 均满足： 若二分图不一定存在完美匹配，则 的最大匹配数为： 即我们只需要最小化亏损 。 如果 中的每个点 连向 中下标在某个区间 内的点，若区间满足连续包含性，根据 Hall 定理，只需检验所有连
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Hall 婚姻定理 (Hall's Marriage Theorem)

## 1. 定理内容与充要条件
设二分图 $G = (V_1, V_2, E)$，$|V_1| \le |V_2|$。$G$ 中存在包含 $V_1$ 中所有顶点的完全匹配（即最大匹配为 $|V_1|$）的**充要条件**是：
对于 $V_1$ 的任意子集 $S \subseteq V_1$，其在 $V_2$ 中的邻域集合 $N(S) = \{v \in V_2 \mid \exists u \in S, (u, v) \in E\}$ 均满足：
$$
|N(S)| \ge |S|
$$

---

## 2. 广义最大匹配公式 (Hall 极值定理)
若二分图不一定存在完美匹配，则 $G$ 的最大匹配数为：
$$
\text{MaxMatch} = |V_1| - \max_{S \subseteq V_1} \bigl( |S| - |N(S)| \bigr)
$$
即我们只需要最小化亏损 $\max(|S| - |N(S)|)$。

---

## 3. 竞赛常见建模与算法化应用

### (1) 区间连边模型 + 线段树维护 (最常见考法，如 POI / CF 题)
如果 $V_1$ 中的每个点 $i$ 连向 $V_2$ 中下标在某个区间 $[L_i, R_i]$ 内的点，若区间满足连续包含性，根据 Hall 定理，只需检验所有**连续区间的子集** $S = [l, r]$ 是否满足：
$$
|N([l, r])| \ge \sum_{i \in [l, r]} cnt_i
$$
移项后可得：
$$
|N([l, r])| - \sum_{i \in [l, r]} cnt_i \ge 0
$$
这可以用**线段树维护区间最大子段和**或**区间前缀/后缀最值**，在 $O(N \log N)$ 时间内完成动态插入与合法性判定，彻底避开跑 $O(V \sqrt{E})$ 网络流的复杂度瓶颈。

### (2) 贪心可匹配性判定
按某种权值贪心选择匹配对象时，每加入一个元素，判断剩余未匹配集合是否依然满足 Hall 条件。

---

## 4. 竞赛实战模板：Hall 定理 + 线段树动态区间维护
以下模板演示当左右部连边具有区间连续性质时，使用线段树动态维护 $\min(|N(S)| - |S|)$ 以快速判定是否存在完全匹配：

```cpp
#include <bits/stdc++.h>
using namespace std;
using ll = long long;
const int N = 200005;
struct Node {
    ll lmax, rmax, sum, max_val;
} tr[N << 2];
// 线段树维护区间最大子段和 / 亏损值
void pushup(int u) {
    tr[u].sum = tr[u << 1].sum + tr[u << 1 | 1].sum;
    tr[u].lmax = max(tr[u << 1].lmax, tr[u << 1].sum + tr[u << 1 | 1].lmax);
    tr[u].rmax = max(tr[u << 1 | 1].rmax, tr[u << 1 | 1].sum + tr[u << 1].rmax);
    tr[u].max_val =
        max({tr[u << 1].max_val, tr[u << 1 | 1].max_val, tr[u << 1].rmax + tr[u << 1 | 1].lmax});
}
void build(int u, int l, int r, ll k) {
    if (l == r) {
        tr[u] = {-k, -k, -k, -k};
        return;
    }
    int mid = (l + r) >> 1;
    build(u << 1, l, mid, k);
    build(u << 1 | 1, mid + 1, r, k);
    pushup(u);
}
void update(int u, int l, int r, int pos, ll val) {
    if (l == r) {
        tr[u].sum += val;
        tr[u].lmax += val;
        tr[u].rmax += val;
        tr[u].max_val += val;
        return;
    }
    int mid = (l + r) >> 1;
    if (pos <= mid)
        update(u << 1, l, mid, pos, val);
    else
        update(u << 1 | 1, mid + 1, r, pos, val);
    pushup(u);
}
// 检查是否存在完全匹配：要求所有子集的亏损不超过容许上限 limit
bool check_hall(ll limit) {
    return tr[1].max_val <= limit;
}
```
