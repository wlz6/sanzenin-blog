---
title: Dirichlet生成函数
published: 2026-10-25
description: 其乘法运算运算为 定义 1. 2.当 时,有 性质 不严谨证明 对于n的所有真分数集合 ,其数量显然为n 将其约分,对于分母d,显然有约分后的集合 ,其中 且显然 即 ,得证 定义 性质 证明 当n=1时,显然成立 n>1时,由算术基本定理, 令 显然, 其中 ,得证 证明 当 时显然成立 当 时,由算术基本定理, 令
image: ""
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# Dirichlet生成函数
$F(x)=\sum_{i=1}^{\infty}\frac{a_{i}}{i^x}$

其乘法运算运算为
$\sum_{i=1}^{\infty}\frac{a_{i}}{i^x} \sum_{i=1}^{\infty}\frac{b_i}{i^x}=\sum_{i=1}^{\infty}\frac{1}{i^x}\sum_{d|i}^{}a_{d}b_{\frac{i}{d}}$
# 积性函数

**定义**
1.$f(1)=1$

2.当$gcd(a,b)=1$时,有$f(ab)=f(a)f(b)$
# 欧拉函数
$\varphi(n)=\sum_{i=1}^{n}[\gcd(i,n)=1]$
**性质**
$\sum_{d|n}^{}\phi(d)=n$

**不严谨证明**
对于n的所有真分数集合
$\frac{0}{n},\frac{1}{n},\dots,\frac{n-1}{n}$,其数量显然为n
	将其约分,对于分母d,显然有约分后的集合$\frac{a_{1}}{d},\dots \frac{a_{\phi(d)}}{d}$,其中$a_{i}集合为d所有互质的数,$且显然$d|n$
	即$\sum_{d|n}^{}\phi(d)=n$,得证

# 莫比乌斯函数

定义
$$\mu(n)=\begin{cases}
1,&n=1 \\
(-1)^s,&n=p_{1}p_{2}\dots p_{s} \\
0, &n包含相同质因子
\end{cases}$$
**性质**
$\sum_{d|n}^{}\mu(d)=[n=1]$
**证明**
当n=1时,显然成立
n>1时,由算术基本定理,$n=p_1^{s_1}p_2^{s_2}\dots p_r^{s_r}$
令$n'=p_1p_2\dots p_r$
显然,$\sum_{d|n}\mu(d)=\sum_{d|n'}\mu(d)$
其中 $\sum_{d|n'}\mu(d)=1 + (-1)\binom{r}{1}+(-1)^{2}\binom{r}{2}+\dots +(-1)^r\binom{r}{r}=(1+(-1))^r=0$,得证

# 莫比乌斯函数与欧拉函数联系

$$\sum_{d|n}\mu(d) \frac{n}{d}=\phi(n)$$
**证明**
当$n=1$时显然成立
当$n>1$时,由算术基本定理,$n=p_1^{s_1}p_2^{s_2}\dots p_r^{s_r}$
令$n'=p_1p_2\dots p_r$
	则$\sum_{d|n}\mu(d)\frac{n}{d}=n\sum^{}_{d|n'}\frac{\mu(d)}{d}$
展开得 $n(1-(\frac{1}{p_1}+\frac{1}{p_2}+\dots)+(\frac{1}{p_1 p_2} +\frac{1}{p_1 p_3}+\dots)-\dots)$
$=n(1-\frac{1}{p_1})(1-\frac{1}{p_2})\dots(1-\frac{1}{p_n})$
$=\phi(n)$
# Dirichlet卷积
**定义**
$f,g$ 是任意两个算术函数，其 Dirichlet 卷积定义为
$$(f*g)(n)=\sum^{}_{d|n}f(d)g(\frac{n}{d})$$
Dirichlet卷积的意义是取遍n的所有约数对
**规律**
1. 交换律: $f*g=g*f$
2. 结合律 $f*(g*h)=(f*g)*h$
3. 分配律 $(f+g)*h=f*h+g*h$

其单位元为$\epsilon(n)=[n=1]$
其他常用函数为$常数函数1(n)=1,恒等函数id(n)=n$

### 常用卷积关系

1. $\sum_{d|n} \mu(d) = [n = 1] \iff \mu * 1 = \epsilon$
2. $\sum_{d|n} \varphi(d) = n \iff \varphi * 1 = id$
3. $\sum_{d|n} \mu(d) \frac{n}{d} = \varphi(n) \iff \mu * id = \varphi$
4. $f * \epsilon = f$
5. $f * 1 \neq f$

---

### 证明

**1. 证明 $\mu * 1 = \epsilon$：**
$$(\mu * 1)(n) = \sum_{d|n} \mu(d) 1\left(\frac{n}{d}\right) = \sum_{d|n} \mu(d) = [n = 1] = \epsilon(n)$$

**2. 证明 $\varphi * 1 = id$：**
$$(\varphi * 1)(n) = \sum_{d|n} \varphi(d) 1\left(\frac{n}{d}\right) = \sum_{d|n} \varphi(d) = n = id(n)$$

**3. 证明 $\mu * id = \varphi$：**
$$(\mu * id)(n) = \sum_{d|n} \mu(d) id\left(\frac{n}{d}\right) = \sum_{d|n} \mu(d) \frac{n}{d} = \varphi(n)$$

**4. 证明 $f * \epsilon = f$：**
$$(f * \epsilon)(n) = \sum_{d|n} f(d) \epsilon\left(\frac{n}{d}\right) = \sum_{d|n} f(d) \left[\frac{n}{d} = 1\right] = f(n)$$

**5. 关于 $f * 1$：**
$$(f * 1)(n) = \sum_{d|n} f(d) 1\left(\frac{n}{d}\right) = \sum_{d|n} f(d)$$

#  莫比乌斯反演 (Möbius Inversion)

#### 核心公式
$$f(n) = \sum_{d|n} g(d) \iff g(n) = \sum_{d|n} \mu(d) f\left(\frac{n}{d}\right)$$

*   $f,g$ 为任意算术函数，不要求积性；若二者积性，其卷积也积性。
*   $f(n)$ 称为 $g(n)$ 的**莫比乌斯变换**。
*   $g(n)$ 称为 $f(n)$ 的**莫比乌斯逆变换**。

---

#### 证明方法（利用迪利克雷卷积）


*   **充分性证明**：
    若 $f = g * 1$，则：
    $$\mu * f = \mu * g * 1 = g * \mu * 1 = g * \epsilon = g$$
*   **必要性证明**：
    若 $g = \mu * f$，则：
    $$g * 1 = \mu * f * 1 = f * \mu * 1 = f * \epsilon = f$$


> [!note] 2026-10-25 校订
> 修正欧拉函数的示性函数位置；Dirichlet 卷积和莫比乌斯反演不要求输入函数积性。可直接使用的倍数反演与计数例子见 [算法竞赛数学套路](/posts/obsidian/%E7%AE%97%E6%B3%95%E7%AB%9E%E8%B5%9B%E6%95%B0%E5%AD%A6%E5%A5%97%E8%B7%AF/#4-gcd-恰好值-先算倍数条件-再反演)。
