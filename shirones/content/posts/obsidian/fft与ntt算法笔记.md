---
title: FFT 与 NTT 算法笔记
published: 2026-11-16
description: 设两个多项式分别有 、 个系数： 将乘积展开并按次数合并，得到 这就是线性卷积。直接枚举每一对系数需要 时间。 若改为记录多项式在若干点上的取值，则在每个点 上都有 乘积点值可以通过逐项相乘得到。用点值计算多项式乘法，需要快速完成系数表示与点值表示之间的转换。MIT 6.046J FFT 讲义 次数小于 的多项式由 个
image: /obsidian/FFT_NTT_coefficient_split_tree.png
tags:
  - 算法
  - Obsidian
category: 算法
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

# FFT 与 NTT 算法笔记

## 多项式乘法与点值表示

设两个多项式分别有 $n$、$m$ 个系数：

$$
A(x)=\sum_{i=0}^{n-1}a_ix^i,\qquad
B(x)=\sum_{j=0}^{m-1}b_jx^j.
$$

将乘积展开并按次数合并，得到

$$
\begin{aligned}
C(x)&=A(x)B(x)
=\sum_{i=0}^{n-1}\sum_{j=0}^{m-1}a_ib_jx^{i+j},\\
c_k&=\sum_{\substack{i+j=k\\0\le i<n,\ 0\le j<m}}a_ib_j,
\qquad 0\le k<n+m-1.
\end{aligned}
$$

这就是线性卷积。直接枚举每一对系数需要 $O(nm)$ 时间。

若改为记录多项式在若干点上的取值，则在每个点 $x_k$ 上都有

$$
C(x_k)=A(x_k)B(x_k).
$$

乘积点值可以通过逐项相乘得到。用点值计算多项式乘法，需要快速完成系数表示与点值表示之间的转换。[MIT 6.046J FFT 讲义](https://ocw.mit.edu/courses/6-046j-design-and-analysis-of-algorithms-spring-2012/dcfa155d0ae636c210bebd70e3b87ba1_MIT6_046JS12_lec05.pdf)

次数小于 $N$ 的多项式由 $N$ 个互不相同的点值唯一确定。证明：若 $P$、$Q$ 在这些点取值相同，则 $P-Q$ 有至少 $N$ 个根；非零多项式的根数不超过次数，而 $\deg(P-Q)<N$，所以 $P-Q=0$。因此，只要选取 $N\ge n+m-1$ 个不同的点，就能从乘积点值恢复完整系数。

## FFT 的推导

### 复数与单位根

复数写作 $z=u+iv$，其中 $i^2=-1$。乘法为

$$
(u+iv)(s+it)=(us-vt)+i(ut+vs).
$$

单位圆上的点可以表示为 $e^{i\theta}=\cos\theta+i\sin\theta$。由三角函数的和角公式，

$$
e^{i\alpha}e^{i\beta}
=\cos(\alpha+\beta)+i\sin(\alpha+\beta)
=e^{i(\alpha+\beta)}.
$$

因而乘法对应角度相加，乘方对应角度成倍增加。

求方程 $z^N=1$ 的根。将 $z$ 写为 $re^{i\theta}$，由 $r^N=1$ 得 $r=1$，由 $N\theta$ 是 $2\pi$ 的整数倍得

$$
z=e^{2\pi ik/N},\qquad 0\le k<N.
$$

定义

$$
\omega_N=e^{2\pi i/N}
=\cos\frac{2\pi}{N}+i\sin\frac{2\pi}{N}.
$$

全部 $N$ 次单位根为 $1,\omega_N,\ldots,\omega_N^{N-1}$。若 $\omega_N^u=\omega_N^v$，则 $e^{2\pi i(u-v)/N}=1$，等价于 $N\mid(u-v)$；所以这些根两两不同，且 $\omega_N$ 的阶恰为 $N$。

以下采用 $N=2^s$ 的变换长度。对偶数 $N$，单位根有三条性质。

**周期性：**

$$
\omega_N^{k+N}
=e^{2\pi ik/N}e^{2\pi i}
=\omega_N^k.
$$

**相隔半圈取相反数：**

$$
\omega_N^{k+N/2}
=e^{2\pi ik/N}e^{\pi i}
=-\omega_N^k.
$$

**平方后成为下一层单位根：**

$$
(\omega_N^k)^2
=e^{4\pi ik/N}
=e^{2\pi ik/(N/2)}
=\omega_{N/2}^k.
$$

特别地，$\omega_N^k$ 与 $\omega_N^{k+N/2}$ 的平方相同。全部 $N$ 个单位根平方后，恰好得到 $N/2$ 个单位根，每个出现两次；这使规模为 $N$ 的求值问题能够递归到规模为 $N/2$ 的求值问题。

### 离散傅里叶变换的定义

把系数数组补零到 $N$ 项，令

$$
A(x)=\sum_{j=0}^{N-1}a_jx^j.
$$

在全部 $N$ 次单位根上求值，得到离散傅里叶变换（DFT）：

$$
\widehat a_k
=A(\omega_N^k)
=\sum_{j=0}^{N-1}a_j\omega_N^{jk},
\qquad 0\le k<N.
$$

本文约定正变换使用正指数。每个点值直接计算需要 $O(N)$ 时间，全部点值需要 $O(N^2)$ 时间。FFT 利用单位根之间的关系，以 $O(N\log N)$ 时间计算同一组点值。

### 奇偶拆分

将偶数下标和奇数下标分别组成两个多项式：

$$
A_0(x)=\sum_{j=0}^{N/2-1}a_{2j}x^j,\qquad
A_1(x)=\sum_{j=0}^{N/2-1}a_{2j+1}x^j.
$$

由指数 $2j$ 与 $2j+1$ 的区别，

$$
\begin{aligned}
A(x)
&=\sum_{j=0}^{N/2-1}a_{2j}x^{2j}
+\sum_{j=0}^{N/2-1}a_{2j+1}x^{2j+1}\\
&=A_0(x^2)+xA_1(x^2).
\end{aligned}
$$

求 $A$ 在 $\omega_N^k$ 上的值，只需知道 $A_0$、$A_1$ 在 $(\omega_N^k)^2=\omega_{N/2}^k$ 上的值。两个子多项式的系数个数与所需点值个数都减半，因而可继续采用同一拆分。到 $N=1$ 时，多项式为常数，唯一点值就是 $a_0$。

长度为 $8$ 时，递归中各组包含的原数组元素如下。

![长度为八的系数数组按奇偶下标递归拆分](/obsidian/FFT_NTT_coefficient_split_tree.png)

### 蝶形合并的推导

设已经完成两个长度为 $N/2$ 的子变换：

$$
\begin{aligned}
E_k&=A_0(\omega_{N/2}^k)
=\sum_{j=0}^{N/2-1}a_{2j}\omega_{N/2}^{jk},\\
O_k&=A_1(\omega_{N/2}^k)
=\sum_{j=0}^{N/2-1}a_{2j+1}\omega_{N/2}^{jk},
\qquad 0\le k<N/2.
\end{aligned}
$$

将 $x=\omega_N^k$ 代入奇偶拆分式，由 $(\omega_N^k)^2=\omega_{N/2}^k$ 得

$$
\begin{aligned}
\widehat a_k
&=A_0((\omega_N^k)^2)
+\omega_N^kA_1((\omega_N^k)^2)\\
&=E_k+\omega_N^kO_k.
\end{aligned}
$$

还需计算另一个点 $\omega_N^{k+N/2}$。它与 $\omega_N^k$ 互为相反数，而

$$
(\omega_N^{k+N/2})^2
=\omega_N^{2k+N}
=\omega_N^{2k}
=\omega_{N/2}^k.
$$

所以两个子多项式仍取相同的点值，奇数部分的外部因子变号：

$$
\begin{aligned}
\widehat a_{k+N/2}
&=A_0((\omega_N^{k+N/2})^2)
+\omega_N^{k+N/2}A_1((\omega_N^{k+N/2})^2)\\
&=E_k-\omega_N^kO_k.
\end{aligned}
$$

合并公式为

$$
\begin{aligned}
\widehat a_k&=E_k+\omega_N^kO_k,\\
\widehat a_{k+N/2}&=E_k-\omega_N^kO_k,
\qquad 0\le k<N/2.
\end{aligned}
$$

每对输入 $(E_k,O_k)$ 计算一次 $\omega_N^kO_k$，再通过一加一减得到两个点值；$N/2$ 对输入恰好给出全部 $N$ 个结果。

### 位逆序与按层合并

递归时先取偶数下标，再取奇数下标。设原下标的二进制表示为

$$
j=\sum_{t=0}^{s-1}b_t2^t,\qquad b_t\in\{0,1\}.
$$

第一层按 $b_0$ 分组，第二层按 $b_1$ 分组，依次直到 $b_{s-1}$。叶子从左到右排列时，第一次分组决定叶子位置的最高位，第二次分组决定次高位，因此原下标 $j$ 的叶子位置为

$$
\operatorname{rev}_s(j)
=\sum_{t=0}^{s-1}b_t2^{s-1-t}.
$$

例如 $N=8$ 时，下标 $1=(001)_2$ 位逆序后为 $(100)_2=4$，所以 $a_1$ 位于叶子序列的第 $4$ 个位置（从 $0$ 开始）。完整叶子顺序为

$$
a_0,a_4,a_2,a_6,a_1,a_5,a_3,a_7.
$$

先按位逆序重排，递归树中的每个子问题就占据连续区间。从底层向上依次合并长度为 $2,4,8,\ldots,N$ 的区间，得到迭代变换。每层使用该层长度对应的单位根 $\omega_2,\omega_4,\ldots,\omega_N$；长度为 $M$ 的子变换，其定义中本来就使用 $M$ 次单位根。

每层各子问题的长度总和为 $N$，合并工作量为 $O(N)$。共有 $\log_2N$ 层，因此

$$
T(N)=2T(N/2)+O(N)=O(N\log N).
$$

采用原地迭代时，系数与点值复用同一数组，所需存储空间为 $O(N)$。

### 单位根求和与逆变换

对任意整数 $d$，考虑

$$
S_d=\sum_{k=0}^{N-1}\omega_N^{dk}.
$$

若 $N\mid d$，每一项都为 $1$，于是 $S_d=N$。若 $N\nmid d$，令 $r=\omega_N^d$，则 $r\ne1$ 且 $r^N=1$，由等比数列求和，

$$
S_d=\sum_{k=0}^{N-1}r^k
=\frac{1-r^N}{1-r}
=0.
$$

因此

$$
\sum_{k=0}^{N-1}\omega_N^{dk}
=
\begin{cases}
N,&N\mid d,\\
0,&N\nmid d.
\end{cases}
$$

这个求和关系可以把正变换中的各个系数分离。固定待恢复的下标 $j$，把正变换代入负指数求和：

$$
\begin{aligned}
\frac{1}{N}\sum_{k=0}^{N-1}\widehat a_k\omega_N^{-jk}
&=\frac{1}{N}\sum_{k=0}^{N-1}
\left(\sum_{t=0}^{N-1}a_t\omega_N^{tk}\right)\omega_N^{-jk}\\
&=\frac{1}{N}\sum_{t=0}^{N-1}a_t
\sum_{k=0}^{N-1}\omega_N^{(t-j)k}\\
&=a_j.
\end{aligned}
$$

由于 $0\le t,j<N$，条件 $N\mid(t-j)$ 仅在 $t=j$ 时成立。求和后只有 $Na_j$ 保留，因此除以 $N$ 即可恢复 $a_j$。

逆变换公式为

$$
a_j=\frac{1}{N}\sum_{k=0}^{N-1}\widehat a_k\omega_N^{-jk}.
$$

$\omega_N^{-1}=e^{-2\pi i/N}$ 仍是阶为 $N$ 的单位根，具有同样的周期性、半圈变号与平方折半性质。因此，对点值数组使用负角度的单位根执行同样的分治，最后将每项除以 $N$，就得到原系数。逆变换的时间复杂度同样为 $O(N\log N)$。

## NTT 的推导

### 素数模数下的运算

NTT 在有限域 $\mathbb{F}_q$ 中进行，本文取素数 $q$，以 $0,1,\ldots,q-1$ 表示域元素。加法、减法和乘法都对 $q$ 取模。下文 NTT 公式中的等号均表示 $\mathbb{F}_q$ 内的相等，即对应整数模 $q$ 同余。

每个非零元素都有乘法逆元。对 $u\ne0$，因为 $q$ 为素数，$\gcd(u,q)=1$，所以乘以 $u$ 会把全部非零余数重新排列。比较这些余数的乘积，有

$$
u^{q-1}\prod_{v=1}^{q-1}v
=\prod_{v=1}^{q-1}v.
$$

乘积非零，可以约去，得到费马小定理及逆元公式：

$$
u^{q-1}=1,\qquad u^{-1}=u^{q-2}.
$$

这使等比数列求和中的除法，以及逆变换末尾的归一化，都能在模意义下完成。

### 原根与变换长度

一个非零元素的阶，是使其幂等于 $1$ 的最小正整数。模素数 $q$ 的原根 $g$ 的阶为 $q-1$，因而

$$
1,g,g^2,\ldots,g^{q-2}
$$

恰好遍历全部非零余数。

原根存在可以由有限域中多项式的根数说明。设全部非零元素的阶的最小公倍数为 $d$。对 $d$ 的素因数分解中的每个素数幂 $r^e$，选取一个阶中含有 $r^e$ 的元素；若其阶为 $r^eu$ 且 $\gcd(r,u)=1$，取它的 $u$ 次幂就得到阶为 $r^e$ 的元素。将不同素数对应的元素相乘，得到阶为 $d$ 的元素：这些元素的阶两两互质，乘积的阶等于各阶之积，因为相应子群的交集只有单位元。

另一方面，每个非零元素都是 $x^d-1$ 的根，故 $q-1\le d$；由费马小定理，每个元素的阶均整除 $q-1$，故 $d\le q-1$。于是 $d=q-1$，上述乘积就是一个原根。

要进行长度为 $N$ 的变换，需要一个阶恰为 $N$ 的元素。它的阶必须整除 $q-1$，所以要求

$$
N\mid(q-1).
$$

满足该条件时，定义

$$
\zeta_N=g^{(q-1)/N}.
$$

验证其阶：一方面

$$
\zeta_N^N=g^{q-1}=1;
$$

另一方面，若 $\zeta_N^t=1$，由 $g$ 的阶为 $q-1$ 得

$$
q-1\mid\frac{q-1}{N}t,
$$

等价于 $N\mid t$。因此 $\zeta_N$ 的阶恰为 $N$，且 $1,\zeta_N,\ldots,\zeta_N^{N-1}$ 两两不同。

取 $N=2^s$ 时，模数通常写作 $q=c\,2^h+1$，其中 $c$ 为奇数。支持的二次幂长度满足 $s\le h$。例如

$$
998244353-1=119\cdot2^{23}
$$

且 $g=3$ 是该模数的原根，因此支持的最大二次幂长度为 $2^{23}$。[ACL 的原根实现](https://github.com/atcoder/ac-library/blob/master/atcoder/internal_math.hpp)

检查非零候选 $g$ 是否为原根时，只需对 $q-1$ 的每个不同素因子 $r$ 验证

$$
g^{(q-1)/r}\ne1.
$$

若 $g$ 的阶为真因子 $d<q-1$，则整数 $(q-1)/d>1$ 含有某个素因子 $r$，从而 $d\mid(q-1)/r$，对应幂会等于 $1$；反之，任一这样的幂等于 $1$，都说明阶小于 $q-1$。

### 模意义下的单位根性质

对于偶数长度 $N\mid(q-1)$，必有奇素数模数 $q$。周期性直接来自 $\zeta_N^N=1$：

$$
\zeta_N^{k+N}=\zeta_N^k.
$$

令 $v=\zeta_N^{N/2}$，则 $v^2=1$，即

$$
(v-1)(v+1)=0.
$$

域中没有零因子，所以 $v=1$ 或 $v=-1$。由于 $\zeta_N$ 的阶为 $N$，不能有 $\zeta_N^{N/2}=1$，故

$$
\zeta_N^{N/2}=-1,\qquad
\zeta_N^{k+N/2}=-\zeta_N^k.
$$

对下一层长度，用同一个原根定义 $\zeta_{N/2}=g^{(q-1)/(N/2)}$，于是

$$
\zeta_N^2
=g^{2(q-1)/N}
=g^{(q-1)/(N/2)}
=\zeta_{N/2},
$$

从而

$$
\zeta_N^{2k}=\zeta_{N/2}^k.
$$

这里的 $-1$ 表示余数 $q-1$，半圈变号由域中方程 $v^2=1$ 的两个解导出。

### NTT 正变换与蝶形合并

把系数视为 $\mathbb{F}_q$ 中的元素，定义正变换

$$
\widehat a_k
=\sum_{j=0}^{N-1}a_j\zeta_N^{jk},
\qquad 0\le k<N.
$$

同样按下标奇偶性定义

$$
A_0(x)=\sum_{j=0}^{N/2-1}a_{2j}x^j,\qquad
A_1(x)=\sum_{j=0}^{N/2-1}a_{2j+1}x^j.
$$

$A(x)=A_0(x^2)+xA_1(x^2)$ 是多项式恒等式，在有限域中仍成立。记两个子变换为

$$
\begin{aligned}
E_k&=\sum_{j=0}^{N/2-1}a_{2j}\zeta_{N/2}^{jk},\\
O_k&=\sum_{j=0}^{N/2-1}a_{2j+1}\zeta_{N/2}^{jk}.
\end{aligned}
$$

对 $0\le k<N/2$，展开完整变换并使用折半性质：

$$
\begin{aligned}
\widehat a_k
&=\sum_{j=0}^{N/2-1}a_{2j}\zeta_N^{2jk}
+\sum_{j=0}^{N/2-1}a_{2j+1}\zeta_N^{(2j+1)k}\\
&=\sum_{j=0}^{N/2-1}a_{2j}\zeta_{N/2}^{jk}
+\zeta_N^k\sum_{j=0}^{N/2-1}a_{2j+1}\zeta_{N/2}^{jk}\\
&=E_k+\zeta_N^kO_k.
\end{aligned}
$$

把 $k$ 替换为 $k+N/2$。子变换中的取值点不变，因为

$$
\zeta_{N/2}^{k+N/2}=\zeta_{N/2}^k;
$$

奇数部分的因子变号，因为 $\zeta_N^{k+N/2}=-\zeta_N^k$。于是

$$
\begin{aligned}
\widehat a_{k+N/2}
&=E_k-\zeta_N^kO_k,\\
(\widehat a_k,\widehat a_{k+N/2})
&=(E_k+\zeta_N^kO_k,\ E_k-\zeta_N^kO_k).
\end{aligned}
$$

递归终点仍是 $N=1$ 时的常数多项式。每层 $O(N)$ 次模运算，共 $\log_2N$ 层，故正变换需要 $O(N\log N)$ 时间。位逆序由系数的奇偶拆分决定，与使用复数还是有限域无关，因此仍可按同一叶子顺序进行原地迭代。

### NTT 逆变换的推导

有限域中的单位根也满足求和关系。若 $N\mid d$，

$$
\sum_{k=0}^{N-1}\zeta_N^{dk}=N.
$$

若 $N\nmid d$，令 $r=\zeta_N^d$，则 $r\ne1$，所以 $1-r$ 非零且可逆，得到

$$
\sum_{k=0}^{N-1}r^k
=(1-r^N)(1-r)^{-1}
=0.
$$

因此

$$
\sum_{k=0}^{N-1}\zeta_N^{dk}
=
\begin{cases}
N,&N\mid d,\\
0,&N\nmid d.
\end{cases}
$$

由于 $N\mid(q-1)$，有 $1\le N\le q-1$，所以 $N$ 在模 $q$ 下非零，逆元 $N^{-1}=N^{q-2}$ 存在。将正变换代入：

$$
\begin{aligned}
N^{-1}\sum_{k=0}^{N-1}\widehat a_k\zeta_N^{-jk}
&=N^{-1}\sum_{t=0}^{N-1}a_t
\sum_{k=0}^{N-1}\zeta_N^{(t-j)k}\\
&=N^{-1}\cdot N a_j\\
&=a_j.
\end{aligned}
$$

故逆变换为

$$
a_j=N^{-1}\sum_{k=0}^{N-1}\widehat a_k\zeta_N^{-jk}.
$$

逆单位根可以从原根逆元构造：

$$
\zeta_N^{-1}
=\left(g^{-1}\right)^{(q-1)/N},
\qquad g^{-1}=g^{q-2}.
$$

对点值数组用 $g^{-1}$ 生成各层单位根，执行同样的蝶形合并，再把每一项乘以 $N^{-1}$，就得到原系数。

### 小模数例子

取 $q=17$、$g=3$。由于 $3^8\equiv-1\pmod{17}$，而 $3^{16}\equiv1\pmod{17}$，$3$ 的阶为 $16$，是原根。长度为 $4$ 的单位根为

$$
\zeta_4=3^{16/4}\equiv13\pmod{17},
\qquad
(1,\zeta_4,\zeta_4^2,\zeta_4^3)=(1,13,16,4).
$$

对系数 $(1,2,3,4)$，偶数与奇数下标数组分别是 $(1,3)$、$(2,4)$。由于 $\zeta_2=-1$，两个子变换为

$$
(E_0,E_1)=(1+3,\ 1-3)=(4,15),
$$

$$
(O_0,O_1)=(2+4,\ 2-4)=(6,15).
$$

在模 $17$ 下合并：

$$
\begin{aligned}
\widehat a_0&=4+6=10,\\
\widehat a_2&=4-6=15,\\
\widehat a_1&=15+13\cdot15=6,\\
\widehat a_3&=15-13\cdot15=7.
\end{aligned}
$$

所以完整点值数组为 $(10,6,15,7)$。这里按原下标顺序存放结果，而计算过程中按成对点值合并。

逆单位根为 $\zeta_4^{-1}=4$，归一化因子为 $4^{-1}=13$。例如恢复下标 $j=1$ 的系数：

$$
a_1
=13\left(10+6\cdot4+15\cdot16+7\cdot13\right)
=13\cdot8
=2.
$$

此例中的全部等式均在 $\mathbb{F}_{17}$ 内成立。

## 由变换得到卷积

### 点值相乘为什么得到卷积

对 FFT 取 $\xi=\omega_N$，对 NTT 取 $\xi=\zeta_N$。将两个数组补零到相同长度 $N$，并记其正变换为 $\widehat a$、$\widehat b$。逐点相乘后，

$$
\begin{aligned}
\widehat c_k
&=\widehat a_k\widehat b_k\\
&=\left(\sum_{i=0}^{N-1}a_i\xi^{ik}\right)
\left(\sum_{j=0}^{N-1}b_j\xi^{jk}\right)\\
&=\sum_{i=0}^{N-1}\sum_{j=0}^{N-1}a_ib_j\xi^{(i+j)k}.
\end{aligned}
$$

对这些乘积点值做逆变换。复数域中的 $N^{-1}$ 表示 $1/N$；有限域中表示模逆元。恢复出的第 $t$ 项（$0\le t<N$）为

$$
\begin{aligned}
\widetilde c_t
&=N^{-1}\sum_{k=0}^{N-1}\widehat c_k\xi^{-tk}\\
&=\sum_{i=0}^{N-1}\sum_{j=0}^{N-1}a_ib_j
\left(N^{-1}\sum_{k=0}^{N-1}\xi^{(i+j-t)k}\right)\\
&=\sum_{\substack{0\le i,j<N\\i+j\equiv t\pmod N}}a_ib_j.
\end{aligned}
$$

最后一步来自单位根求和：只有 $N\mid(i+j-t)$ 的项保留。因此，长度为 $N$ 的变换直接给出长度为 $N$ 的循环卷积。

### 线性卷积为什么需要补零

原数组仅在 $0\le i<n$、$0\le j<m$ 时非零，所以所有有效次数满足

$$
0\le i+j\le n+m-2.
$$

若选取 $N\ge n+m-1$，这些次数均小于 $N$。此时对 $0\le t<N$，条件 $i+j\equiv t\pmod N$ 等价于 $i+j=t$，从而

$$
\widetilde c_t=c_t.
$$

若长度不足，则次数 $t$、$t+N$ 等位置的系数会累加到同一项。从多项式看，单位根满足 $\xi^N=1$，变换结果只能区分模 $x^N-1$ 后的多项式：

$$
x^{t+N}\equiv x^t\pmod{x^N-1}.
$$

因而需要完整线性卷积时，选取不小于 $n+m-1$ 的最小二次幂 $N$；需要循环卷积时，则利用这一折叠关系。例如模 $x^m-1$ 的卷积可先求普通乘积，再将次数按模 $m$ 合并。

NTT 还必须满足 $N\mid(q-1)$。ACL 的模数卷积接口也要求素数模数及足够大的二次幂因子。[ACL 卷积文档](https://atcoder.github.io/ac-library/production/document_en/convolution.html)

### 计算量与数值结果

完整卷积包含两次正变换、一次逐点相乘、一次逆变换，总时间为 $O(N\log N)$，采用原地迭代时空间为 $O(N)$。

FFT 的上述等式在复数域内精确成立；浮点实现会产生舍入误差。若原系数为整数，只有当恢复值与真实整数之间的误差小于 $1/2$ 时，四舍五入才保证正确，系数范围和变换长度会影响这一误差。

NTT 的运算给出精确的模 $q$ 卷积系数。单个模数只确定余数；需要其他模数下的结果或普通整数系数时，可以使用多个 NTT 模数与 CRT，并满足整数恢复的范围条件。下文三份源代码均执行 NTT，其中前两份将变换函数命名为 `fft`。


## Luogu P4245：任意模数多项式乘法

### 题目重述

给出两个多项式及目标模数 $p$，输出它们相乘后各项系数对 $p$ 取模的结果。目标模数不一定支持所需长度的 NTT。

### 关键观察

代码分别在 $p_1=998244353$、$p_2=1004535809$、$p_3=469762049$ 下做 NTT。记三次卷积得到的第 $k$ 项余数为 $r_1,r_2,r_3$，令 $P=p_1p_2p_3$，$M_i=P/p_i$，并令 $t_i=M_i^{-1}\pmod {p_i}$，则 CRT 重建为

$$
C_k=\left(\sum_{i=1}^{3} r_iM_it_i\right)\bmod P.
$$

### 解析

代码先把两个多项式补零至足够大的二次幂长度，再对三个 NTT 模数分别执行卷积。最后用 CRT 恢复普通整数系数，并对目标模数 $p$ 取模。所有中间合并使用 `__int128`，避免乘积溢出。

CRT 只能唯一恢复区间 $[0,P)$ 中的整数。若原系数均在 $[0,p)$，则单个卷积系数满足

$$
C_k\le \min(\ell_A,\ell_B)(p-1)^2,
$$

其中 $\ell_A,\ell_B$ 是两个输入的系数个数。恢复普通整数系数要求这一上界严格小于 $P$。三模数共同支持的二次幂长度受 $p_2$ 限制，最大为 $2^{21}$。

总时间复杂度为 $O(N\log N)$，空间复杂度为 $O(N)$；三组模数只增加常数倍开销。

### 代码

源代码文件：`luogu/P4245.cpp`。

```cpp
#include <bits/stdc++.h>
#define ll long long
#define pr pair<ll, ll>
#define tii tuple<int, int, int>
#define tll tuple<ll, ll, ll>
#define sp << ' ' <<
#define inf 0x3f3f3f3f3f3f3f3f
#define N 100005
#define lc p << 1
#define rc p << 1 | 1
#define ll __int128
using namespace std;

int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    auto qp = [&](ll x, ll k, ll MOD) {
        ll res = 1;
        while (k) {
            if (k & 1)
                res = (res * x) % MOD;
            x = (x * x) % MOD;
            k >>= 1;
        }
        return res;
    };
    auto multi = [&](vector<ll> a, vector<ll> b, ll MOD) {
        auto n = a.size();
        const ll g = 3, gi = qp(3, MOD - 2, MOD);
        auto fft = [&](vector<ll> &a, ll g) {
            int n = a.size();
            vector<int> aim(n, 0);
            for (int i = 1; i < n; i++) {
                aim[i] = (aim[i >> 1] >> 1) + (i & 1) * (n >> 1);
            }
            for (int i = 0; i < n; i++) {
                if (i < aim[i])
                    swap(a[i], a[aim[i]]);
            }
            for (int len = 2; len <= n; len <<= 1) {
                for (int left = 0; left < n; left += len) {
                    ll gk = 1;
                    ll g1 = qp(g, (MOD - 1) / len, MOD);
                    for (int j = 0; j < len / 2; j++) {
                        ll x = a[left + j], y = a[left + j + len / 2] * gk % MOD;
                        a[left + j] = (x + y) % MOD, a[left + j + len / 2] = (x - y + MOD) % MOD;
                        gk = (gk * g1) % MOD;
                    }
                }
            }
        };
        fft(a, g);
        fft(b, g);
        vector<ll> res(n, 0);
        for (int i = 0; i < n; i++) {
            res[i] = a[i] * b[i] % MOD;
        }
        fft(res, gi);
        auto inv = qp(n, MOD - 2, MOD);
        for (int i = 0; i < n; i++) {
            res[i] = (res[i] * inv) % MOD;
        }
        return std::move(res);
    };
    auto solve = [&]() {
        long long n, m, p;
        cin >> n >> m >> p;
        vector<ll> a(n + 1, 0);
        vector<ll> b(m + 1, 0);
        for (int i = 0; i <= n; i++) {
            long long x;
            cin >> x;
            a[i] = x;
        }
        for (int i = 0; i <= m; i++) {
            long long x;
            cin >> x;
            b[i] = x;
        }
        for (m = n + m, n = 1; n <= m; n <<= 1)
            ;
        a.resize(n, 0);
        b.resize(n, 0);
        const ll p1 = 998244353;
        const ll p2 = 1004535809;
        const ll p3 = 469762049;
        ll product = (ll)p1 * p2 * p3;
        ll M1 = product / p1;
        ll M2 = product / p2;
        ll M3 = product / p3;
        ll t1 = qp((ll)(M1 % p1), p1 - 2, p1);
        ll t2 = qp((ll)(M2 % p2), p2 - 2, p2);
        ll t3 = qp((ll)(M3 % p3), p3 - 2, p3);
        auto r1 = multi(a, b, p1);
        auto r2 = multi(a, b, p2);
        auto r3 = multi(a, b, p3);
        for (int k = 0; k <= m; k++) {
            ll C = ((ll)r1[k] * M1 * t1 + (ll)r2[k] * M2 * t2 + (ll)r3[k] * M3 * t3) % product;

            cout << (long long)(C % p) << ' ';
        }
    };

    solve();
    return 0;
}
```

## AtCoder practice2 F：固定模数卷积

### 题目重述

给出两个系数数组，计算它们在模 $998244353$ 下的线性卷积，并按次数递增输出系数。

### 关键观察

$998244353=119\cdot2^{23}+1$，原根为 $3$，因而支持不超过 $2^{23}$ 的二次幂长度 NTT。代码中的 `fft` 函数执行 NTT。

### 解析

程序读取两个数组后补零到不小于输出系数个数的最小二次幂，分别做正变换，再逐点相乘。逆变换使用 $3^{-1}\pmod{998244353}$，随后乘 $N^{-1}\pmod{998244353}$，输出前 $n+m-1$ 项。复杂度为 $O(N\log N)$，空间复杂度为 $O(N)$。

### 代码

源代码文件：`atcoder/practice2/f.cpp`。

```cpp
#include <bits/stdc++.h>
#define ll long long
#define pr pair<ll, ll>
#define tii tuple<int, int, int>
#define tll tuple<ll, ll, ll>
#define sp << ' ' <<
#define inf 0x3f3f3f3f3f3f3f3f
#define N 100005
#define M 1000005
#define lc p << 1
#define rc p << 1 | 1
using namespace std;
const ll MOD = 998244353;
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);
    auto qp = [&](ll x, ll k) {
        ll res = 1;
        while (k) {
            if (k & 1)
                res = (res * x) % MOD;
            x = (x * x) % MOD;
            k >>= 1;
        }
        return res;
    };
    const ll g = 3, gi = qp(3, MOD - 2);
    auto fft = [&](vector<ll> &a, ll g) {
        int n = a.size();
        vector<int> aim(n, 0);
        for (int i = 1; i < n; i++) {
            aim[i] = (aim[i >> 1] >> 1) + (i & 1) * (n >> 1);
        }
        for (int i = 0; i < n; i++) {
            if (i < aim[i])
                swap(a[i], a[aim[i]]);
        }
        for (int len = 2; len <= n; len <<= 1) {
            for (int left = 0; left < n; left += len) {
                ll gk = 1;
                ll g1 = qp(g, (MOD - 1) / len);
                for (int j = 0; j < len / 2; j++) {
                    ll x = a[left + j], y = a[left + j + len / 2] * gk % MOD;
                    a[left + j] = (x + y) % MOD, a[left + j + len / 2] = (x - y + MOD) % MOD;
                    gk = (gk * g1) % MOD;
                }
            }
        }
    };
    auto solve = [&]() {
        ll n, m;
        cin >> n >> m;
        n--, m--;
        vector<ll> a(n + 1, 0);
        vector<ll> b(m + 1, 0);
        for (int i = 0; i <= n; i++)
            cin >> a[i];
        for (int i = 0; i <= m; i++)
            cin >> b[i];
        for (m = n + m, n = 1; n <= m; n <<= 1)
            ;
        a.resize(n, 0);
        b.resize(n, 0);
        fft(a, g);
        fft(b, g);
        vector<ll> res(n, 0);
        for (int i = 0; i < n; i++) {
            res[i] = a[i] * b[i] % MOD;
        }
        fft(res, gi);
        auto inv = qp(n, MOD - 2);
        for (int i = 0; i <= m; i++) {
            cout << (res[i] * inv) % MOD << ' ';
        }
    };

    solve();
    return 0;
}
```

## 2023 ICPC 西安区域赛 F：An Easy Counting Problem

### 题目重述

给定整数 $k$、素数 $p$ 和非零剩余类 $x$，求满足

$$
0\le b\le a<p^k,\qquad \binom ab\equiv x\pmod p
$$

的整数对 $(a,b)$ 数量，答案对 $q=998244353$ 取模。约束为 $1\le k\le2^{1000}$、$2\le p\le5000$、$1\le x<p$；$k$ 以二进制字符串给出。[原题：2023 ICPC 西安区域赛 F](https://codeforces.com/gym/105471/problem/F?locale=en)

### 关键观察

将 $a,b$ 写成 $k$ 位的 $p$ 进制数，不足的位补零：

$$
a=\sum_{t=0}^{k-1}a_tp^t,\qquad
b=\sum_{t=0}^{k-1}b_tp^t.
$$

则

$$
\binom ab\equiv\prod_{t=0}^{k-1}\binom{a_t}{b_t}\pmod p.
$$

当 $p$ 为素数时，$\binom p r$ 在 $0<r<p$ 时均能被 $p$ 整除，故 $(1+z)^p\equiv1+z^p\pmod p$。于是

$$
(1+z)^a\equiv\prod_{t=0}^{k-1}(1+z^{p^t})^{a_t}\pmod p.
$$

比较 $z^b$ 的系数即得 Lucas 定理。各因子的局部次数小于 $p$，因此不产生数位进位。

若某位 $b_t>a_t$，该位组合数为零，整个乘积为零，与 $x\ne0$ 矛盾。若各位均满足 $0\le b_t\le a_t<p$，则 $b\le a$；局部组合数的分子、分母都由小于 $p$ 的正整数相乘，所以其模 $p$ 余数非零。合法整数对因此与 $k$ 组满足局部条件的数位对一一对应，答案取决于这些组合数余数的乘积。

取模 $p$ 的原根 $\rho$，令 $m=p-1$。单个数位产生余数 $r$ 的方案数为

$$
f_r=\#\left\{(i,j):0\le j\le i<p,\ \binom ij\equiv r\pmod p\right\},
\qquad 1\le r<p.
$$

合并两段数位时，余数满足乘法关系，所以频数转移为

$$
(f\star h)_r=\sum_{uv\equiv r\pmod p}f_uh_v.
$$

因为 $\rho^i\rho^j=\rho^{(i+j)\bmod m}$，按离散对数重新排列余数后，下标转移成为模 $m$ 的加法。定义

$$
F(z)=\sum_{e=0}^{m-1}f_{\rho^e\bmod p}z^e,
$$

则所求答案为

$$
[z^{\log_\rho x}]\left(F(z)^k\bmod(z^m-1)\right).
$$

组合数及余数乘法在模 $p$ 下计算；方案数及 NTT 运算在模 $q=998244353$ 下计算。代码中的 `root` 是模 $p$ 的原根 $\rho$，`g = 3` 是模 $q$ 的 NTT 原根。

### 解析

每个数位的余数分布都相同，因而需要计算 $F(z)$ 在模 $z^m-1$ 下的 $k$ 次幂。二进制快速幂需要 $O(L)$ 次循环卷积，其中 $L$ 为 $k$ 的二进制长度。

程序先用 Pascal 递推计算 `c[i][j]`，此处对 $p$ 取模。枚举 $0\le j\le i<p$，将每项计入 `base.s[rev[c[i][j]]]`，其中 `rev[v]` 存储 $\log_\rho v$。

`poly::operator*` 使用模 $q$ 的 NTT 计算两个长度为 $m$ 的数组的线性卷积。设结果为 $c_e$，由于 $z^m=1$，循环卷积需要折叠为

$$
h_e=c_e+c_{e+m}\pmod q,\qquad 0\le e<m.
$$

两个输入的次数都小于 $m$，乘积次数至多 $2m-2$，因此每项最多折叠一次。代码先完成逆变换及乘 $N^{-1}$ 的归一化，再把第 $e+m$ 项加回第 $e$ 项，最后保留前 $m$ 项。

`qp_` 从二进制字符串末尾向前读取，维护当前底数与累积结果。初始结果是常数多项式 $1$；当前位为一时乘入底数，每处理一位就将底数平方。全部数位处理完后，`res.s[rev[x]]` 即为答案。

设二进制串长度为 $L$，代码选取不小于 $2m$ 的最小二次幂 $N$。由 $p\le5000$ 可知 $N\le2^{14}$，且 $N\mid(q-1)$。Pascal 表与逐候选原根搜索的预处理耗时至多 $O(p^2)$；快速幂耗时 $O(LN\log N)$。总时间复杂度为 $O(p^2+LN\log N)$，空间复杂度为 $O(p^2+N)$；其中平方级空间来自代码保存的完整 Pascal 表。

### 代码

源代码文件：`reginonals/23xian/f.cpp`。

```cpp
#include <bits/extc++.h>
#include <bits/stdc++.h>
#define ll long long
#define pr pair<ll, ll>
#define tii tuple<int, int, int>
#define tll tuple<ll, ll, ll>
#define sp << ' ' <<
#define inf 0x3f3f3f3f3f3f3f3f
#define N 100005
#define M 1000005
#define lc p << 1
#define rc p << 1 | 1
using namespace std;
using namespace __gnu_pbds;
ll p, x;
string k;
const ll MOD = 998244353;
auto qp = [](ll x, ll k) {
    ll res = 1;
    while (k) {
        if (k & 1)
            res = (res * x) % MOD;
        x = (x * x) % MOD;
        k >>= 1;
    }
    return res;
};
const ll g = 3, gi = qp(3, MOD - 2);
int main() {
    ios::sync_with_stdio(0);
    cin.tie(nullptr);
    cout.tie(nullptr);

    auto solve = [&]() {
        cin >> k >> p >> x;
        class poly {
          public:
            vector<ll> s;
            poly() {
                s.assign(p - 1, 0);
                s[0] = 1;
            }
            poly(vector<ll> &&a) noexcept : s(std::move(a)){};
            static void ntt(vector<ll> &a, ll g) {
                int n = a.size();
                vector<ll> aim(a.size(), 0);
                for (int i = 1; i < n; i++) {
                    aim[i] = (aim[i >> 1] >> 1) + (i & 1) * (n >> 1);
                }
                for (int i = 0; i < n; i++) {
                    if (i < aim[i])
                        swap(a[i], a[aim[i]]);
                }
                for (int len = 2; len <= n; len <<= 1) {
                    ll g1 = qp(g, (MOD - 1) / len);
                    for (int left = 0; left < n; left += len) {
                        ll gk = 1;
                        for (int j = 0; j < len / 2; j++) {
                            ll x = a[left + j], y = a[left + j + len / 2] * gk % MOD;
                            a[left + j] = (x + y) % MOD, a[left + j + len / 2] = (x - y + MOD) % MOD;
                            gk = gk * g1 % MOD;
                        }
                    }
                }
            }
            poly operator*(const poly &oth) const {
                vector<ll> a = s;
                vector<ll> b = oth.s;
                auto ori = a.size();
                auto n = a.size(), m = b.size();
                for (m = n + m, n = 1; n < m; n <<= 1)
                    ;
                a.resize(n, 0);
                b.resize(n, 0);
                ntt(a, g);
                ntt(b, g);
                for (int i = 0; i < n; i++) {
                    a[i] = a[i] * b[i] % MOD;
                }
                ntt(a, gi);
                auto inv = qp(n, MOD - 2);
                for (int i = 0; i < ori; i++) {
                    a[i] = a[i] * inv % MOD, a[i + ori] = a[i + ori] * inv % MOD;
                    a[i] = (a[i] + a[i + ori]) % MOD;
                }
                a.resize(ori);
                return {std::move(a)};
            };
        };
        auto find_root = [&](ll p) {
            if (p == 2)
                return 1;
            for (int i = 2; i < p; i++) {
                auto x = i;
                for (int j = 1, x = i; j < p - 1; j++, x = x * i % p) {
                    if (x == 1)
                        goto ca;
                }
                return i;
            ca:;
            }
        };
        auto root = find_root(p);
        vector<ll> rev(p + 10, 0);
        for (int i = 1, cnt = 0; cnt < p - 1; cnt++, i = i * root % p) {
            rev[i] = cnt;
        }
        vector<vector<ll>> c(p + 5, vector<ll>(p + 5, 0));
        auto init = [&]() {
            c[0][0] = 1;
            for (int i = 1; i < p; i++) {
                c[i][0] = 1, c[i][i] = 1;
                for (int j = 1; j < i; j++) {
                    c[i][j] = (c[i - 1][j - 1] + c[i - 1][j]) % p;
                }
            }
        };
        init();
        poly base;
        base.s[0] = 0;
        for (int i = 0; i < p; i++) {
            for (int j = 0; j <= i; j++) {
                base.s[rev[c[i][j]]]++;
            }
        }
        auto qp_ = [&](poly x, string &k) {
            poly res;
            while (k.size()) {
                if (k.back() == '1')
                    res = (res * x);
                x = (x * x);
                k.pop_back();
            }
            return res;
        };
        auto res = qp_(base, k);
        cout << res.s[rev[x]];
    };

    solve();
    return 0;
}
```
