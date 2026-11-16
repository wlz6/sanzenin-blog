---
title: 排列进制(Cantor展开)
published: 2026-09-03
description: "CSES Permutation Order 这道题让我们求一个排列在全排列中的位次,以及给出n和位次求解这个排列,我们可以把一个排列映射到一个进制上进行处理. 形式化的,我们记一个数字的阶乘进制为 : ,阶乘进制的每一个数字 ，在排列中正好对应了在当前剩余数字中，选第几个小的数字.直接运用进制转换的知识进行转换即可,"
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

[CSES  Permutation Order](https://cses.fi/problemset/task/3397)
这道题让我们求一个排列在全排列中的位次,以及给出n和位次求解这个排列,我们可以把一个排列映射到一个进制上进行处理.
形式化的,我们记一个数字的阶乘进制为$$ X=a_n​⋅n!+a_{n−1}​⋅(n−1)!+⋯+a_1​⋅1!+a_0​⋅0!$$
$s.t.$  :$0\le a_i \le i$,阶乘进制的每一个数字 $a_i$，在排列中正好对应了在当前剩余数字中，选第几个小的数字.直接运用进制转换的知识进行转换即可,注意每次当前排列的数字用完就要移除
*代码*

```cpp
#include <algorithm>
#include <bit>
#include <bits/stdc++.h>
#include <iterator>
#include <set>
#include <tuple>
#include <unordered_map>
#define N 2000005
#define inf 0x3f3f3f3f3f3f3f3f
#define ll unsigned long long
#define pr pair<int, int>
#define i128 __int128
using namespace std;
ll n, m, q, ans, ma, t, product, k;
const ll mod = 1000000007;
ll f[N];
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    vector<ll> f(30);
    vector<int> tem;
    f[0] = 1;
    for (ll i = 1; i <= 20; i++)
        f[i] = f[i - 1] * i;
    cin >> t;
    auto reset = [&](int n) {
        tem.clear();
        for (int i = 1; i <= n; i++)
            tem.push_back(i);
        ;
    };
    auto find = [&](int n, ll k) {
        k--;
        reset(n);
        vector<int> res;
        for (int i = n - 1; i >= 0; i--) {
            auto x = k / (f[i]);
            k %= (f[i]);
            res.push_back(tem[x]);
            tem.erase(tem.begin() + x);
        }
        return res;
    };
    auto cal = [&](int n, vector<ll> &p) -> ll {
        reset(n);
        int cnt = n - 1;
        ll res = 0;
        tem.push_back(1e9);
        for (auto num : p) {
            auto pos = upper_bound(tem.begin(), tem.end(), num) - tem.begin();
            res += f[cnt--] * (pos - 1);
            tem.erase(tem.begin() + pos);
        }
        return res;
    };
    while (t--) {
        int flag;
        cin >> flag;
        if (flag == 1) {
            cin >> n >> k;
            auto res = find(n, k);
            for (auto x : res)
                cout << x << ' ';
            cout << '\n';
        } else {
            cin >> n;
            vector<ll> t;
            for (int i = 1; i <= n; i++) {
                ll x;
                cin >> x, t.push_back(x);
            }
            cout << cal(n, t) + 1 << '\n';
        }
    }
    return 0;
}
```
