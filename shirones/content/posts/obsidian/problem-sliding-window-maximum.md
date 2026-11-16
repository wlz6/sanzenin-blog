---
title: "Problem: Sliding Window Maximum (LeetCode 239)"
published: 2026-11-16
description: 给定整数数组 与正整数 ，输出每个长度为 的滑动窗口中的最大值。 - 输入： ， - 输出： - 约束： 若窗口内存在下标 且 ，则只要 仍在窗口中， 就不可能成为最大值。因此可用单调递减双端队列维护可能成为最大值的元素下标：遇到更大元素时从尾部弹出较小元素，窗口左边界滑动时从头部弹出过期下标。队列值严格递减，队首即为
image: /obsidian/step1.png
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Problem: Sliding Window Maximum (LeetCode 239)

## 题目重述

给定整数数组 $\text{nums}$ 与正整数 $k$，输出每个长度为 $k$ 的滑动窗口中的最大值。

- 输入：$\text{nums} = [1, 3, -1, -3, 5, 3, 6, 7]$，$k = 3$
- 输出：$[3, 3, 5, 5, 6, 7]$
- 约束：$1 \le k \le |\text{nums}| \le 10^5$

## 关键观察

若窗口内存在下标 $i < j$ 且 $\text{nums}[i] \le \text{nums}[j]$，则只要 $j$ 仍在窗口中，$\text{nums}[i]$ 就不可能成为最大值。因此可用单调递减双端队列维护可能成为最大值的元素下标：遇到更大元素时从尾部弹出较小元素，窗口左边界滑动时从头部弹出过期下标。队列值严格递减，队首即为当前窗口最大值。

## 解析

遍历下标 $i$，维护双端队列 $\text{dq}$：

1. 若 $\text{dq.front}() < i - k + 1$，则 $\text{pop\_front}()$。
2. 当队列非空且 $\text{nums}[\text{dq.back}()] \le \text{nums}[i]$ 时，持续 $\text{pop\_back}()$。
3. 将 $i$ 入队。
4. 若 $i \ge k - 1$，将 $\text{nums}[\text{dq.front}()]$ 加入答案。

以 $\text{nums} = [1, 3, -1, -3, 5, 3, 6, 7]$、$k = 3$ 为例：

首个窗口 $[1, 3, -1]$ 建立时，下标 $0$ 入队；下标 $1$ 的值 $3$ 大于 $1$，弹出 $0$ 后入队；下标 $2$ 的值 $-1$ 直接入队。此时队列为 $[1, 2]$，对应值 $[3, -1]$，窗口最大值为 $3$。

![步骤 1：首个窗口建立，维护单调递减队列](/obsidian/step1.png)

当 $i = 4$、值为 $5$ 的元素进入时，$5$ 大于队列中所有元素，依次弹出 $2, 3$ 后只剩 $[4]$，窗口最大值更新为 $5$。

![步骤 2：新元素 5 破坏单调性，弹出所有较小元素](/obsidian/step2.png)

最终窗口到达数组末尾，队首下标 $7$ 对应值 $7$，窗口最大值为 $7$。

![步骤 3：最终窗口，队首始终为当前最大值](/obsidian/step3.png)

**复杂度分析**：每个下标最多入队一次、出队一次，时间复杂度为 $O(n)$；队列最多保存 $k$ 个下标，空间复杂度为 $O(k)$。

## 代码

```cpp
class Solution {
public:
    vector<int> maxSlidingWindow(vector<int>& nums, int k) {
        deque<int> dq;
        vector<int> res;
        for (int i = 0; i < nums.size(); ++i) {
            if (!dq.empty() && dq.front() < i - k + 1) dq.pop_front();
            while (!dq.empty() && nums[dq.back()] <= nums[i]) dq.pop_back();
            dq.push_back(i);
            if (i >= k - 1) res.push_back(nums[dq.front()]);
        }
        return res;
    }
};
```
