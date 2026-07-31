# 让 AI 看懂我的 Apple 健康

## 完全免费、每人一套、照着点就能完成

版本：1.0（2026 年 7 月）

> 这是保留给开发者和排错使用的电脑高级版。普通用户请看 [只用手机的一键部署教程](GUIDE-MOBILE.zh-CN.md)。

> 先说人话：手表把数据交给 iPhone；iPhone 的“快捷指令”每天抄一份；Cloudflare 替你保管；AI 需要时再来读。

这份教程没有使用任何付费健康导出 App。代码是独立写的，采用 MIT 开源许可证。每个人应部署自己的那一份，不要多人共用一把钥匙。

---

## 0. 先看结果

完成后，AI 有 3 个按钮：

| AI 按钮 | 它能做什么 | 一般何时用 |
|---|---|---|
| `health_now` | 看最近心率、今天步数、最近睡眠 | 聊天时自然关心你 |
| `health_detail` | 看某晚睡眠或某项指标明细 | 你追问“昨晚哪里不好” |
| `health_trends` | 看 7、14、30 天变化 | 你问“最近是不是越来越晚睡” |

AI 不能改数据，不能删数据，也不能命令手表测量。

### 你要准备的东西

- 一台 iPhone。
- Apple Watch 可有可无。没有手表时，可上传 iPhone 已经记录的步数等数据。
- 一个免费的 Cloudflare 账号。
- 一台只在安装时使用的 Windows、Mac 或 Linux 电脑。
- 一个能添加“HTTP MCP”的 AI 软件。

> 电脑部署完成后就可以关机。以后是 iPhone 和 Cloudflare 自己工作。

---

## 1. 下载代码

在公开仓库页面点绿色 **Code**，再点 **Download ZIP**。

解压后，你会看到一个叫 `apple-health-shortcuts-mcp` 的文件夹。

不要急着改代码。我们只会改一个编号和一个时区。

---

## 2. 给电脑装“小助手”

打开 [Node.js 官网](https://nodejs.org/)，下载写着 **LTS** 的版本并安装。一路使用默认选项即可。

安装完成后：

1. 打开项目文件夹。
2. 在文件夹空白处按住 `Shift`，点鼠标右键。
3. 选择“在终端中打开”或“在 PowerShell 中打开”。
4. 复制下面这行，粘贴后按回车：

```powershell
npm install
```

看到一堆英文滚过是正常的。没有红色 `error` 就可以继续。

---

## 3. 登录 Cloudflare

先到 [Cloudflare](https://dash.cloudflare.com/sign-up) 注册免费账号。

回到刚才的黑色窗口，复制：

```powershell
npx wrangler login
```

浏览器会打开。登录后允许 Wrangler 连接你的 Cloudflare。

如果浏览器显示成功，就回到黑色窗口。

---

## 4. 创建“健康小抽屉”

复制：

```powershell
npx wrangler d1 create apple-health-shortcuts
```

屏幕会给你一段内容，其中有：

```text
database_id = "一长串编号"
```

复制双引号里的那串编号。

用记事本打开项目里的 `wrangler.toml`，找到：

```toml
database_id = "PASTE_YOUR_D1_DATABASE_ID_HERE"
```

只把大写占位文字换成你的编号。双引号要保留。

### 改成自己的时区

同一个文件里还有：

```toml
HEALTH_TIME_ZONE = "Asia/Shanghai"
```

如果你在中国大陆，不用改。

常见例子：

| 地方 | 填什么 |
|---|---|
| 中国大陆 | `Asia/Shanghai` |
| 新西兰 | `Pacific/Auckland` |
| 日本 | `Asia/Tokyo` |
| 英国 | `Europe/London` |
| 美国洛杉矶 | `America/Los_Angeles` |

保存并关掉文件。

现在复制：

```powershell
npx wrangler d1 execute apple-health-shortcuts --remote --file=./schema.sql
```

若询问是否继续，输入 `y` 再回车。看到 `Executed` 或 `success` 就成功。

---

## 5. 造两把钥匙

复制：

```powershell
npm run make-keys
```

项目里会出现 `my-keys.local`。用记事本打开它，你会看到：

```text
UPLOAD_KEY=第一把很长的钥匙
MCP_ACCESS_KEY=第二把很长的钥匙
```

- 第一把给 iPhone，用来上传。
- 第二把给 AI，用来读取。

不要把这个文件发到群里，不要上传到 GitHub，不要把钥匙放进教程截图。

### 把第一把放进 Cloudflare

复制：

```powershell
npx wrangler secret put UPLOAD_KEY
```

窗口让你输入时，粘贴第一把钥匙，按回车。

### 把第二把放进 Cloudflare

复制：

```powershell
npx wrangler secret put MCP_ACCESS_KEY
```

粘贴第二把钥匙，按回车。

Cloudflare 会把这两项当作秘密保存，之后不会把原文显示出来。

---

## 6. 把代码放上云

复制：

```powershell
npm run deploy
```

最后会出现类似：

```text
https://apple-health-shortcuts-mcp.你自己的名字.workers.dev
```

把它记为：

```text
我的地址
```

用浏览器打开：

```text
我的地址/healthz
```

看到 `"ok": true`，云端就好了。

> 从现在起，电脑可以关机。Cloudflare 会继续工作。

---

## 7. 先做最小版 iPhone 快捷指令

iOS 版本与语言不同，按钮名字可能差一两个字。看到意思相近的名字就选它。

我们先只上传心率，确认整条路能走通，再复制出其他指标。这样不容易迷路。

### 7.1 新建快捷指令

1. 打开 iPhone 的“快捷指令”。
2. 进入“快捷指令”页。
3. 点右上角 `+`。
4. 点顶部名称，改为“上传健康给 AI”。

### 7.2 找出今天的心率

1. 点“添加操作”。
2. 搜索“查找健康样本”。
3. 添加“查找健康样本”。
4. 把“类型”改成“心率”。
5. 添加条件：开始日期“是今天”。
6. 排序方式选“开始日期”，顺序选“最新优先”。
7. 打开“限制”，数量先填 `20`。

### 7.3 把每条心率做成“小卡片”

1. 再添加“重复每一项”。
2. 确认它重复的是刚才找到的健康样本。
3. 在“重复”框里面添加“获取健康样本的详细信息”。
4. 详细信息选“值”，对象选“重复项目”。
5. 再添加一次“获取健康样本的详细信息”。
6. 这次详细信息选“开始日期”，对象仍选“重复项目”。
7. 添加“格式化日期”，日期选刚取出的开始日期。
8. 日期格式选择 `ISO 8601`。找不到时，选“自定”，填写：

```text
yyyy-MM-dd'T'HH:mm:ssXXX
```

9. 添加“字典”，放入 4 行：

| 左边的名字 | 右边放什么 |
|---|---|
| `type` | 手动文字 `heart_rate` |
| `value` | 刚才取出的“值” |
| `at` | 刚才格式化的日期 |
| `unit` | 手动文字 `bpm` |

10. 添加“添加到变量”，变量新建为“健康小卡片”。

“结束重复”应该在这些操作的下面。

### 7.4 把小卡片寄出去

在“结束重复”下面：

1. 添加“URL”。
2. 填入：

```text
我的地址/ingest
```

3. 添加“获取 URL 内容”。
4. 点开“显示更多”。
5. 方法选 `POST`。
6. 请求正文选 `JSON`。
7. JSON 添加一行：

| 名字 | 内容 |
|---|---|
| `metrics` | 变量“健康小卡片” |

8. 请求头添加一行：

| 名字 | 内容 |
|---|---|
| `X-Upload-Key` | `my-keys.local` 里的第一把钥匙 |

9. 最后加一个“显示结果”，显示“获取 URL 内容”的结果。

第一次运行会询问“健康”权限和联网权限，请允许读取心率与访问你自己的地址。

点右下角运行。若结果中出现：

```text
"ok": true
```

心率上传成功。

---

## 8. 加上其他健康数据

最稳的做法是复制刚才的“心率小块”，每次只改 3 个地方：

1. “查找健康样本”的类型。
2. 字典里的 `type`。
3. 字典里的 `unit`。

这些小块都要把字典加入同一个“健康小卡片”变量，最后只寄一次。

| iPhone 健康类型 | `type` 必须填 | `unit` 建议填 | 日期怎么选 |
|---|---|---|---|
| 心率 | `heart_rate` | `bpm` | 过去 24 小时，最多 20 条 |
| 心率变异性 | `heart_rate_variability` | `ms` | 过去 24 小时 |
| 静息心率 | `resting_heart_rate` | `bpm` | 过去 2 天 |
| 呼吸速率 | `respiratory_rate` | `breaths/min` | 过去 24 小时 |
| 血氧饱和度 | `blood_oxygen_saturation` | `%` | 过去 24 小时 |
| 步数 | `step_count` | `count` | 今天 |
| 爬楼层 | `flights_climbed` | `count` | 今天 |
| 步行与跑步距离 | `walking_running_distance` | `km` | 今天 |
| 活动能量 | `active_energy_burned` | `kcal` | 今天 |
| 锻炼时间 | `apple_exercise_time` | `min` | 今天 |
| 手腕温度 | `wrist_temperature` | `°C` | 过去 2 天 |

不是每台设备都有全部项目。找不到的项目直接跳过。

> 步数等活动数据可能由手机、手表和 App 各记一份。iPhone 健康通常会帮你处理来源优先级，但本项目不会替你判断“哪台设备更准”。

---

## 9. 再做一个睡眠快捷指令

睡眠和心率长得不一样，所以单独做，名字叫“上传睡眠给 AI”。

### 9.1 找睡眠

1. 新建快捷指令。
2. 添加“查找健康样本”。
3. 类型选“睡眠”或“睡眠分析”。
4. 开始日期选择“过去 18 小时”。
5. 排序按开始日期。

如果界面没有“过去 18 小时”：

1. 添加“当前日期”。
2. 添加“调整日期”，减去 `18` 小时。
3. 在“查找健康样本”中设置：开始日期晚于“调整后的日期”。

### 9.2 做睡眠小卡片

添加“重复每一项”。在重复框里，分别取得：

- “值”或“睡眠阶段”。
- “开始日期”。
- “结束日期”。

把开始、结束日期都格式化成 `ISO 8601`。

添加字典：

| 左边的名字 | 右边放什么 |
|---|---|
| `stage` | 健康样本的“值”或“睡眠阶段” |
| `start` | 格式化后的开始日期 |
| `end` | 格式化后的结束日期 |

把这个字典添加到变量“睡眠小卡片”。

在“结束重复”下面，和心率上传一样添加 URL 与“获取 URL 内容”：

- URL：`我的地址/ingest`
- 方法：`POST`
- 正文：`JSON`
- JSON 名字：`sleep`
- JSON 内容：变量“睡眠小卡片”
- 请求头名字：`X-Upload-Key`
- 请求头内容：第一把钥匙

运行后看到 `"ok": true` 就好了。

---

## 10. 让它每天自己跑

### 睡醒后上传睡眠

1. 打开“快捷指令”底部的“自动化”。
2. 点 `+`，选择“睡眠”或“起床”。
3. 选择“醒来时”。
4. 选择运行“上传睡眠给 AI”。
5. 选择“立即运行”；旧版 iOS 则关闭“运行前询问”。

### 每天上传状态

1. 再建一个自动化。
2. 选择“特定时间”。
3. 例如设为每天 `21:30`。
4. 选择运行“上传健康给 AI”。
5. 选择“立即运行”。

一天上传 1～2 次已经够日常聊天。不要每分钟上传。

### 一个真实限制

iPhone 处于锁定、省电、没网或系统繁忙时，自动化可能推迟，某些健康内容也可能暂时不给快捷指令读取。这不是云端坏了。

实用补救：

- 把两个快捷指令放到桌面小组件。
- 发现今天没数据时，手动点一下。
- 不要承诺“每秒实时”。免费快捷指令方案更像定时送信。

---

## 11. 把 MCP 交给 AI

在支持“HTTP MCP”或“Streamable HTTP MCP”的 AI 软件里新增一个 MCP。

填：

| 设置 | 内容 |
|---|---|
| 名称 | `我的 Apple 健康` |
| MCP 地址 | `我的地址/mcp` |
| 认证方式 | `Bearer Token` |
| Token | `my-keys.local` 里的第二把钥匙 |

如果软件没有单独的 Token 格子，而是让你加“请求头”，填：

| 请求头名字 | 请求头内容 |
|---|---|
| `Authorization` | `Bearer 第二把钥匙` |

点“测试连接”。正确时会看到：

```text
health_now
health_detail
health_trends
```

### 如何让角色在聊天中自然关心

把这段话放进角色设定：

```text
聊天涉及睡眠、疲劳、运动、恢复或身体感受时，可以自然调用健康工具。
只有数据确实相关时才提到，不要每句话都报数字，不要装作医生。
可以像朋友一样说：“你昨晚睡得比平时少，今天要不要早点休息？”
```

这不是“AI 在后台一直盯着你”。实际过程是：

1. 你开始聊天。
2. AI 觉得健康数据与当前话题有关。
3. AI 调用一次 `health_now`。
4. 需要追问时，才再调用 `health_detail` 或 `health_trends`。

所以通常一次就够，不会每次把三个工具全叫一遍。

---

## 12. 优点和缺点

### 优点

- 不买健康导出 App，也不用一直开电脑。
- 每个人的数据放在自己的 Cloudflare 账号。
- 两把钥匙分工：iPhone 只能上传，AI 只能读取。
- AI 只有 3 个只读工具，不容易调用错。
- 代码公开，能看见它保存和返回了什么。
- 免费额度对个人每天几次上传通常非常充足。

### 缺点

- 第一次要用电脑部署，还要手工搭两个快捷指令。
- iPhone 自动化不是严格的实时系统，偶尔会延后或漏跑。
- Apple 健康里的数据本身可能延迟；睡眠通常要醒来后才完整。
- Cloudflare 是第三方云端。数据不是只留在手机里。
- 这是个人项目，不保证永远兼容所有 AI 客户端和未来 iOS。
- 免费服务有使用上限；个人使用通常够，但不是“法律保证永远零元”。
- 它只能整理数据，不能作出医疗诊断。

### 与付费导出 App 相比

| 比较 | 本方案 | 付费导出 App |
|---|---|---|
| 费用 | 通常可在免费额度内 | 可能订阅或买断 |
| 第一次设置 | 较长 | 通常更简单 |
| 数据类型适配 | 自己维护 | 厂商维护 |
| 自动化稳定性 | 受快捷指令限制 | 往往更成熟 |
| 可检查代码 | 可以 | 通常不可以 |
| 电脑是否常开 | 不需要 | 通常也不需要 |

---

## 13. 出错时只看这里

### 浏览器打开 `/healthz` 不是 `ok: true`

- 检查 Worker 地址有没有抄错。
- 重新运行 `npm run deploy`。

### 快捷指令说 401 或“上传钥匙不对”

- 请求头名字必须是 `X-Upload-Key`。
- 内容必须是第一把 `UPLOAD_KEY`，前后不要多空格。

### AI 说 401 或“MCP 钥匙不对”

- AI 要用第二把 `MCP_ACCESS_KEY`。
- 请求头必须是 `Authorization: Bearer 第二把钥匙`。

### 上传成功，但 AI 看不到睡眠

- 打开 iPhone“健康”，先确认里面真的有睡眠阶段。
- 给快捷指令“健康”读取权限。
- 把日期范围暂时改成过去 2 天，手动运行一次。
- 睡眠刚结束时等几分钟再试。

### 数据重复

同一种指标、同一个时间会覆盖旧记录，不会无限重复。睡眠则按夜晚更新。

### 钥匙发到群里了

重新运行：

```powershell
npm run make-keys
npx wrangler secret put UPLOAD_KEY
npx wrangler secret put MCP_ACCESS_KEY
```

然后把 iPhone 与 AI 里的钥匙一起换掉。

---

## 14. 隐私底线

- 不共用 Worker、数据库或钥匙。
- 不把真实健康 JSON 发到公开 Issue。
- 不公开 `my-keys.local`。
- 不在群截图里露出完整 Worker 地址和钥匙。
- 只连接自己信任的 AI。
- 介意云端保存健康数据的人，不要使用本方案。

代码默认保留：

- 普通健康明细约 35 天。
- 睡眠约 120 天。

每天会清理更旧的数据。可在 `wrangler.toml` 修改天数。

---

## 15. 它为什么有机会免费？

Cloudflare 当前默认提供 Workers 免费计划；官方文档列出的免费额度包括每天 100,000 次 Worker 请求，D1 也有每天的免费读写额度。个人每天上传几次、聊天时偶尔读取，通常离这个数量很远。但平台以后可能调整规则，所以请以官方页面为准。

官方参考：

- [Cloudflare D1 入门与部署命令](https://developers.cloudflare.com/d1/get-started/)
- [Cloudflare Worker 密钥说明](https://developers.cloudflare.com/workers/configuration/secrets/)
- [Cloudflare Workers 当前价格与免费额度](https://developers.cloudflare.com/workers/platform/pricing/)
- [Apple：快捷指令可以查找健康样本](https://support.apple.com/en-nz/guide/shortcuts/apd3c845e881/ios)
- [Apple：快捷指令如何用 POST 发送 JSON](https://support.apple.com/en-nz/guide/shortcuts/apd58d46713f/ios)
- [Apple：时间、睡眠等自动化可设置为无需确认运行](https://support.apple.com/en-ca/guide/shortcuts/apd602971e63/ios)

---

## 16. 一张最终检查表

- [ ] `/healthz` 显示 `ok: true`
- [ ] 心率快捷指令手动运行显示 `ok: true`
- [ ] 睡眠快捷指令手动运行显示 `ok: true`
- [ ] 两个自动化都选了“立即运行”
- [ ] AI 测试连接看到 3 个工具
- [ ] AI 能回答“我昨晚睡了多久”
- [ ] `my-keys.local` 没有发给别人

全部打勾，就完成了。
