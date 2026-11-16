---
title: PDE上机
published: 2026-06-17
description: "真实解: 其中拉普拉斯算子 精确解析解： 五点差分 解析解: 求前向,后向,CN 精确解析解： 4的ADI 控制方程： 边界条件（双端固定）： 初始条件（给定初始位移与初始速度）： 精确解析解： tao=0.05,h=0.1 tao=0.1,h=0.1 控制方程： 初始条件： 边界条件：右边界 （左边界无边界条件，通过"
image: ""
tags:
  - 数学专业笔记
  - Obsidian
category: 数学专业笔记
lang: zh_CN
draft: false
---

<!-- 由 scripts/sync-obsidian.mjs 从 Obsidian Vault 生成，请勿直接编辑。 -->

### 1. 程序一：一维变系数常微分方程（两点边值问题）的中心差分求解

$$ \begin{cases} -\displaystyle \frac{d}{dx}\left(x \frac{du}{dx}\right) + x^2 \frac{du}{dx} - x\,u = (x^2-1)\cos x,\quad 0<x<\pi\\[6pt] u(0)=0,\quad u(\pi)=0 \end{cases} $$ **真实解**:
$$u(x)=\sin(x)$$

```matlab
clear; clc; close all;
a=0
b=pi
N=1000
h=pi/N
x_all=linspace(a,b,N+1)
x=x_all(2:end-1)'
mid=2*x./(h^2)-x;
up=-x/(h^2)-1/(2*h)+x.^2/(2*h)%推导要正确
low=-x/(h^2)+1/(2*h)-x.^2/(2*h)
low=[low(2:end);0]%注意spdiags会从头开始取
up=[0;up(1:end-1)]
A=spdiags([low,mid,up],[-1,0,1],N-1,N-1)
f=@(x)(x.^2-1).*cos(x)%两个向量之间用.*
u_exact=sin(x)
f_val=f(x)
u_cal=A\f_val
plot(x,u_exact,'r-',LineWidth=2)
hold on
plot(x,u_cal,'b--',LineWidth=3)
hold on
grid on
xlabel("x")
ylabel("u")
legend("实际解","数值解")
err=max(abs(u_cal-u_exact))
fprintf("最大误差 %.10f",err);
```
### 2. 程序二：二维泊松方程的五点差分与 Kronecker 积直接法求解
 $$ \begin{cases} \displaystyle \Delta u = 2\pi^2 e^{\pi(x+y)}\big(\sin\pi x \cos\pi y + \cos\pi x \sin\pi y\big),\quad (x,y)\in G=(0,1)\times(0,1)\\[6pt] u(x,y)=0,\quad (x,y)\in \partial G \end{cases} $$ 其中拉普拉斯算子 $\displaystyle \Delta u=\frac{\partial^2 u}{\partial x^2}+\frac{\partial^2 u}{\partial y^2}$
 **精确解析解**： $$ u(x,y)=e^{\pi(x+y)}\sin\pi x \sin\pi y $$
 五点差分
```matlab
clear; clc;
hs=[1/64,1/128];
a=0;
b=1;
for id=1:length(hs)
    h=hs(id);
    N=round(1/h);
    r=1/(h^2);
    grid1d=linspace(a,b,N+1);
    grid1d=grid1d(2:end-1);%一定要截掉断点
    [X,Y]=ndgrid(grid1d,grid1d);%注意是ndgrid
    x=X(:);
    y=Y(:);
    u_exact=exp((x+y).*pi).*sin(x*pi).*sin(y*pi);
    f=2*(pi^2)*exp((x+y).*pi).*(sin((x+y).*pi));
    I=speye(N-1);
    e=ones(N-1,1);
    Tx=spdiags([r*e,-2*r*e,r*e],[-1,0,1],N-1,N-1);
    Ty=spdiags([r*e,-2*r*e,r*e],[-1,0,1],N-1,N-1);
    A=kron(I,Tx)+kron(Ty,I);
    u=A\f;
    err=max(abs(u-u_exact));
    fprintf("现在步长%.4f 误差%.10f\n",h,err);
end
```
### 3. 程序三：一维热传导方程的三种经典时间步进格式对比

$$ \frac{\partial u}{\partial t} = \frac{\partial^2 u}{\partial x^2} + \sin t, \quad 0 < x < 1, \quad t > 0 $$
$$ u_x(0, t) = u_x(1, t) = 0 $$
	$$ u(0, x) = \cos(\pi x)$$
**解析解**:
$$ u_{\text{}}(x,t) = e^{-\pi^2 t}\cos(\pi x) + 1 - \cos t $$
求前向,后向,CN
```matlab
clear;
clc;
a=0;
b=1;
J=40;
N=3200;
h=1/J;
tao=1/N;
r=tao/(h^2);
x=linspace(0,1,J+1)';
t=linspace(0,1,N+1)';
e=ones(J+1,1);
del=spdiags([r*e,-2*r*e,r*e],[-1,0,1],J+1,J+1);
del(1,2)=2*r;
del(end,end-1)=2*r;


A_f=speye(J+1)+del;
u_f=cos(pi*x);
err=0;
for i=2:length(t)
    tim=t(i);
    u_exact=exp(-pi^2*tim)*cos(pi*x)+1-cos(tim);
    u_f=A_f*u_f+tao*sin(t(i-1));%注意sin要乘以tao
    err=max(err,max(abs(u_exact-u_f)));
end
fprintf("前向 最大误差%.10f\n",err);


A_b=speye(J+1)-del;
u_b=cos(pi*x);
err=0;
for i=2:length(t)
    tim=t(i);
    u_exact=exp(-pi^2*tim)*cos(pi*x)+1-cos(tim);
    u_b=A_b\(u_b+tao*sin(tim));
    err=max(err,max(abs(u_exact-u_b)));
end
fprintf("后向 最大误差%.10f\n",err);


A_cn=speye(J+1)-del/2;
B_cn=speye(J+1)+del/2;
u_cn=cos(pi*x);
err=0;
for i=2:length(t)
    tim=t(i);
    u_exact=exp(-pi^2*tim)*cos(pi*x)+1-cos(tim);
    u_cn=A_cn\(B_cn*u_cn+tao*0.5*(sin(tim)+sin(t(i-1))));
    err=max(err,max(abs(u_exact-u_cn)));
end
fprintf("CN 最大误差%.10f\n",err);
```
### 4. 程序四：二维热传导方程在混合边界条件下的 Crank-Nicolson 格式求解
$$ \begin{cases} \displaystyle \frac{\partial u}{\partial t} = 4^{-2}\left(\frac{\partial^2 u}{\partial x^2}+\frac{\partial^2 u}{\partial y^2}\right),\quad (x,y)\in G=(0,1)\times(0,1),\ t>0\\[6pt] u(0,y,t)=u(1,y,t)=0,\quad 0<y<1,\ t>0\\[6pt] \displaystyle \frac{\partial u}{\partial y}(x,0,t)=\frac{\partial u}{\partial y}(x,1,t)=0,\quad 0<x<1,\ t>0\\[6pt] u(x,y,0)=\sin \pi x \cos \pi y,\quad (x,y)\in \overline{G} \end{cases} $$
**精确解析解**：
$$ u(x,y,t) = \sin\pi x \cos\pi y \exp\left(-\frac{\pi^2}{8}t\right) $$
```matlab
a=1/16;
N=1600;
left=0;
right=1;
J=40;
K=40;
x=linspace(left,right,J+1);
y=linspace(left,right,K+1);
h=1/J;
tao=1/N;
r=a*tao/(h^2);
t=linspace(0,1,N+1)';
e_x=ones(J-1,1);
e_y=ones(K+1,1);
Tx=spdiags([r*e_x,-2*r*e_x,r*e_x],[-1,0,1],J-1,J-1);
Ty=spdiags([r*e_y,-2*r*e_y,r*e_y],[-1,0,1],K+1,K+1);
Ty(1,2)=2*r;
Ty(K+1,K)=2*r;
delta2d=kron(speye(K+1),Tx)+kron(Ty,speye(J-1));%不要记反
I=speye((J-1)*(K+1));
A=I-delta2d/2;
B=I+delta2d/2;
[X,Y]=ndgrid(x(2:end-1),y);
u=sin(pi*X).*cos(pi*Y);
u=u(:);
err=0;
for i=2:length(t)
    tim=t(i);
    u_exact=sin(pi*X).*cos(pi*Y)*exp(-(pi^2/8)*tim);
    u_exact=u_exact(:);
    u=A\(B*u);
    err=max(abs(u_exact-u));
end
fprintf("二维CN全局最大误差 %.10f",err);

```
### 5. 程序五：二维热传导方程求解效率对比（CN 全隐式 vs ADI 维数分裂）
4的ADI
```matlab
clear;
clc;
a=1/16;
J=40;
K=40;
N=1600;
h=1/J;
tao=1/N;
r=a*tao/(h^2);
t=linspace(0,1,N+1)';
x=linspace(0,1,J+1)';
x=x(2:end-1);
y=linspace(0,1,K+1)';
[X,Y]=ndgrid(x,y);
X=X(:);
Y=Y(:);
ex=ones(J-1,1);
ey=ones(K+1,1);
delx=spdiags([r*ex,-2*r*ex,r*ex],[-1,0,1],J-1,J-1);
dely=spdiags([r*ey,-2*r*ey,r*ey],[-1,0,1],K+1,K+1);
dely(1,2)=2*r;
dely(end,end-1)=2*r;
I=speye((K+1)*(J-1));
Ax=I-kron(speye(K+1),delx)/2;
By=I+kron(dely,speye(J-1))/2;
Ay=I-kron(dely,speye(J-1))/2;
Bx=I+kron(speye(K+1),delx)/2;
err=0;
u_adi=sin(pi*X).*cos(pi*Y);
for i=2:length(t)
    tim=t(i);
    u_exact=exp(-pi^2/8*tim)*sin(pi*X).*cos(pi*Y);
    u_half=Ax\(By*u_adi);
    u_adi=Ay\(Bx*u_half);
    err=max(err,max(abs(u_exact-u_adi)));
end
fprintf("adi 最大误差%.10f\n",err);
```
### 6. 程序六：一维二阶波动方程的经典三层显式格式求解
* **控制方程**：
  $$\frac{\partial^2 u}{\partial t^2} = \frac{\partial^2 u}{\partial x^2}, \quad x \in (0, 1), \quad t > 0$$
* **边界条件**（双端固定）：
  $$u(0, t) = 0, \quad u(1, t) = 0$$
* **初始条件**（给定初始位移与初始速度）：
  $$u(x, 0) = \sin(\pi x)$$
  $$\frac{\partial u}{\partial t}(x, 0) = -\sin(\pi x)$$
* **精确解析解**：
  $$u(x, t) = \sin(\pi x) \cos(\pi t) - \frac{1}{\pi} \sin(\pi x) \sin(\pi t)$$
tao=0.05,h=0.1
tao=0.1,h=0.1
```matlab
u1=cal(0.05,0.1);
u2=cal(0.1,0.1);
function [u_num]=cal(tao,h)
    J=(1/h);
    N=(2/tao);
    a=1;
    x=linspace(0,1,J+1)';
    x=x(2:end-1);
    t=linspace(0,2,N+1)';
    e=ones(J-1,1);
    r=(a^2*tao^2)/(h^2);
    A=spdiags([r*e,(2-2*r)*e,r*e],[-1,0,1],J-1,J-1);
    u_pre=sin(pi*x);
    u_num=-sin(pi*x)*tao+u_pre;
    err=0;
    for i=3:length(t)
        tim=t(i);
        u_exact=sin(pi*x)*cos(pi*tim)-sin(pi*x)*sin(pi*tim)/pi;
        tmp=u_num;
        u_num=A*u_num-u_pre;
        u_pre=tmp;
        err=max(err,max(abs(u_exact-u_num)));
    end
    fprintf("%.10f",err)
end
```
### 7. 程序七：一维一阶对流方程（负波速）的显/隐式迎风格式对比
####  数学模型
*   **控制方程**：$\frac{\partial u}{\partial t} - 2 \frac{\partial u}{\partial x} = 0 \quad (x \in [0, 1], \; t > 0)$
*   **初始条件**：$u(x,0) = 1 + \sin(2\pi x)$
*   **边界条件**：右边界 $u(1,t) = 1$（左边界无边界条件，通过差分格式直接计算递推）
tao=0.02,h=0.1显隐,求t=0.1,0.5
```matlab
clear; clc; close all;
a=-2;
tao=0.02;
h=0.1;
N=0.5/tao;
J=1/h;
x=linspace(0,1,J+1)';
t=linspace(0,0.5,N+1)';
e=ones(J+1,1);
r=(a*tao/h);
A=spdiags([zeros(J+1,1),(1+r)*e,-r*e],[-1,0,1],J+1,J+1);
B=spdiags([zeros(J+1,1),(1-r)*e,r*e],[-1,0,1],J+1,J+1);
A(end,end)=1;%边界条件
B(end,end)=1;
u_num_ex=1+sin(2*pi*x);%显式
u_num_im=1+sin(2*pi*x);%隐式
for i=2:length(t)
    tim=t(i);
    u_num_ex=A*u_num_ex;
    u_num_im=B\u_num_im;
    if tim==0.1 || tim==0.5
        figure
        plot(x,u_num_ex,"b--");
        hold on;
        plot(x,u_num_im,"r--o");
        legend("显式迎风","隐式迎风");
        grid on;
        title(sprintf("t=%.1f",tim));
    end
end
```
### 8. 程序八：一维一阶对流方程（正波速）在不同稳定性条件下的对流行为对比
#### 数学模型
*   **控制方程**：$\frac{\partial u}{\partial t} + \frac{\partial u}{\partial x} = 0 \quad (0 < x < \infty, \; t > 0)$
*   **初始条件**：$u(x,0) = |x-1|$
*   **边界条件**：左边界 $u(0,t) = 1$（右边界无边界条件，直接递推）
*   **内容说明**：求解一阶线性对流方程（波速为正值，代表物理信号自左向右传播），左边界为入口边界条件。
tao=0.5,h=0.5显式
tao=1,h=0.5隐式
t=1,2,3,4,5
```matlab
clear; clc; close all;
tao=0.5;
h=0.5;
fprintf("tao=%.1f,h=%.1f\n",tao,h);
J=10/h;
N=5/tao;
a=1;
r=a*tao/h;
x=linspace(0,10,J+1)';
t=linspace(0,5,N+1)';
e=ones(J+1,1);
A=spdiags([r*e,(1-r)*e,zeros(J+1,1)],[-1,0,1],J+1,J+1);
A(1,1)=1;
u_num_ex=abs(x-ones(J+1,1));
for i=2:length(t)
    tim=t(i);
    u_num_ex=A*u_num_ex;
    if tim==1||tim==2||tim==3||tim==4||tim==5
        plot(x,u_num_ex,'DisplayName',sprintf("t=%.1f",tim));
        hold on;
    end
end
legend;

clear; clc; close all;
tao=1;
h=0.5;
fprintf("tao=%.1f,h=%.1f\n",tao,h);
J=10/h;
N=5/tao;
a=1;
r=a*tao/h;
x=linspace(0,10,J+1)';
t=linspace(0,5,N+1)';
e=ones(J+1,1);
B=spdiags([-r*e,(1+r)*e,zeros(J+1,1)],[-1,0,1],J+1,J+1);
B(1,1)=1;
u_num_im=abs(x-ones(J+1,1));
for i=2:length(t)
    tim=t(i);
    u_num_im=B\u_num_im;
    if tim==1||tim==2||tim==3||tim==4||tim==5
        plot(x,u_num_im,'DisplayName',sprintf("t=%.1f",tim));
        hold on;
    end
end
legend;
```
