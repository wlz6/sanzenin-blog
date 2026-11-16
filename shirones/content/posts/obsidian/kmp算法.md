---
title: KMP算法
published: 2026-09-03
description: KMP（Knuth-Morris-Pratt）算法是一种高效的字符串匹配算法。其核心精髓在于：当匹配失败时，能够利用已匹配的信息，避免模式串指针的回溯，实现“原地”跳跃。 next[i] 的定义是：模式串 P 从第 1 位到第 i 位组成的字符串中，最长公共前后缀的长度。 为何会有 j = ne[j]？ 当 P[i]
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

KMP（Knuth-Morris-Pratt）算法是一种高效的字符串匹配算法。其核心精髓在于：**当匹配失败时，能够利用已匹配的信息，避免模式串指针的回溯，实现“原地”跳跃。**

## 1. 核心逻辑：`next` 数组（前缀函数）
`next[i]` 的定义是：**模式串 `P` 从第 1 位到第 `i` 位组成的字符串中，最长公共前后缀的长度。**

### 代码实现
```cpp
// 模式串 P 从 1 开始，长度为 n
ne[1] = 0;
for (int i = 2, j = 0; i <= n; i++) {
    // 如果当前字符不匹配，j 持续回退到 ne[j]
    while (j && P[i] != P[j + 1]) j = ne[j];
    // 如果匹配，最长公共前后缀长度 j 加 1
    if (P[i] == P[j + 1]) j++;
    // 记录结果
    ne[i] = j;
}
```

*   **为何会有 `j = ne[j]`？** 当 `P[i] != P[j+1]` 时，说明以 `i` 结尾的匹配串出现了失配，我们需要找一个比当前 `j` 更短的、已经处理过的后缀能与之重合的部分前缀。

---

## 2. 复杂度证明

这里KMP计算next数组的复杂度直观上很难分析,我们可以考虑j的贡献来分析整体的复杂度。
我们可以考虑j的总增加次数和减少次数：

1.  **增加次数**：在整个 `for` 循环中，`i` 从 2 到 $n$。`j` 只有在 `P[i] == P[j + 1]` 时才会执行 `j++`，这意味着 `j` 在整个生命周期中**最多增加 $n-1$ 次**。
2.  **减少次数**：`while` 循环中的 `j = ne[j]` 操作会使 `j` 减小。因为 `j` 的值始终大于等于 0，**`j` 减少的总次数不可能超过它增加的总次数**。
 因此，总的操作开销 = $O(N) + O(N) = \mathbf{O(N)}$。

---
[例题 P16231 [蓝桥杯 2026 省 A] 基因研究](https://www.luogu.com.cn/problem/P16231)
dp[i][j]的意义是第i位匹配到易感基因第j位的概率,匹配失败时需要用next数组,提前预处理出来在dp时使用
```cpp
#include <bits/stdc++.h>
#include <cstdlib>
#define ll long long
#define N 100005
#define pr pair<ll, ll>
using namespace std;
int n, m, cnt, vv;
const ll mod = 998244353;
int main() {
    ios::sync_with_stdio(0);
    cin >> n >> m;
    string s;
    map<char, int> mp;
    mp['A'] = 0;
    mp['T'] = 1;
    mp['G'] = 2;
    mp['C'] = 3;
    cin >> s;
    vector<int> gene;
    gene.push_back(0);
    for (auto x : s) {
        gene.push_back(mp[x]);
    }
    vector<int> next(m + 5, 0);
    next[1] = 0;
    for (int i = 2, j = 0; i <= m; i++) {
        while (j && gene[i] != gene[j + 1])
            j = next[j];
        if (gene[i] == gene[j + 1])
            j++;
        next[i] = j;
    }
    vector<vector<int>> to(m + 5, vector<int>(5, 0));
    for (int j = 0; j < m; j++) {
        for (int ch = 0; ch < 4; ch++) {
            int now = j;
            while (now && gene[now + 1] != ch)
                now = next[now];
            if (gene[now + 1] == ch)
                now++;
            to[j][ch] = now;
        }
    }
    vector<ll> p(5, 0);
    vector<vector<ll>> dp(n + 5, vector<ll>(m + 5, 0));
    dp[0][0] = 1;
    for (int i = 1; i <= n; i++) {
        for (int j = 0; j < 4; j++) {
            cin >> p[j];
        }
        for (int j = 0; j <= min(i - 1, m - 1); j++) {
            for (int ch = 0; ch < 4; ch++) {
                dp[i][to[j][ch]] = (dp[i][to[j][ch]] + dp[i - 1][j] * p[ch]) % mod;
            }
        }
    }
    ll res = 0;
    for (int j = 0; j < m; j++)
        res = (res + dp[n][j]) % mod;
    cout << (1 - res + mod) % mod;
    return 0;
}
```
