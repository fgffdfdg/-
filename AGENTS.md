# 项目上下文

## 项目概览

**ExportDrive** - 二手车出口全链条工具平台，面向国内二手车商、外贸车行、出口服务商，提供标准化工具与资料支持。

### 核心功能模块

| 模块 | 路由 | 功能 |
|------|------|------|
| 工作台 | `/` | 总览仪表盘、快捷入口、流程指引 |
| 车辆核验 | `/vehicle-check` | VIN码查询、车辆信息核验、出口资格判断 |
| 单证模板 | `/documents` | 报关单、商业发票、装箱单等标准模板生成 |
| 出口许可证 | `/export-license` | 商务部平台入口、已签发许可证云端归档（多 VIN 检索、PDF/图片预览、跨浏览器同步），并保留草单制作 |
| 准入声明 | `/compliance-declaration` | 符合目标市场准入声明文件生成（企业信息+车辆列表+A4预览+PDF导出） |
| 形式发票 | `/proforma-invoice` | 形式发票制作（买方信息+车辆清单+收款信息+PDF导出+数据库存储） |
| 运费测算 | `/shipping` | 国际物流费用计算（多运输方式、多港口） |
| 海运跟踪 | `/tracking` | 海运位置实时跟踪、运输轨迹、船舶状态查询 |
| 准入政策 | `/policies` | 各国二手车进口政策、关税、限制查询 |
| 合规文件 | `/compliance` | 法规政策、行业标准、操作指南、合规清单 |
| 我的记录 | `/my-records` | 个人中心，查看和管理已保存的声明与发票记录 |
| 博客管理 | `/blog-admin` | 博客文章管理后台（列表/新建/编辑/删除） |
| 博客展示 | `/blog` | 博客前端展示（列表页+详情页，SEO优化，SSR渲染） |
| CarClip | `/carclip` | Chrome 扩展落地页（汽车出口通｜车源采集与翻译助手），一键提取汽车之家二手车信息+图片并翻译英文 |
| 客户管理 | `/customers` | 海外买家信息管理（列表/搜索/筛选/新增/编辑/详情/删除） |
| 管理后台 | `/admin` | 独立管理后台（独立认证体系，非用户端 Supabase Auth） |
| 管理登录 | `/admin/login` | 管理员专属登录页（与用户端 `/login` 完全隔离） |
| 组织设置 | `/settings/organization` | 企业信息管理（名称、行业、联系方式） |
| 成员管理 | `/settings/members` | 团队成员管理（邀请/角色变更/停用/移除） |
| 角色管理 | `/settings/roles` | 角色权限管理（预设角色+自定义角色+权限配置） |
| 创建组织 | `/create-org` | 新用户创建个人组织 |
| 接受邀请 | `/invite/[token]` | 通过邀请链接加入组织 |
| 报价计算器 | `/quote-calculator` | 可视化公式搭建：具名单元格统一输入（自动识别数字/公式/备注），顺序排列（↑↓按钮+拖拽排序），公式用中文名称互相引用并联想补全，实时联动求值 |
| 车辆采购 | `/procurement` | 车辆采购合同管理（买方/卖方/车辆信息/收款信息/自定义条款）、A4打印预览、签署文件上传归档、附件管理（绿本/行驶证/代收款协议等） |
| 发票/报税 | `/invoice-tax` | 模块总览、税务局入口、发票抬头维护、报税提醒 |
| 税务局导航 | `/tax-bureaus` | 常用税务局官网收藏、搜索筛选、一键访问与复制链接 |
| 发票抬头 | `/invoice-titles` | 本公司/合作方发票抬头管理（CRUD、默认抬头、标签、税号银行账号复制） |
| 新增抬头 | `/invoice-titles/new` | 新增发票抬头（本公司/合作方，支持海外买家信息） |
| 编辑抬头 | `/invoice-titles/[id]/edit` | 编辑已有发票抬头 |
| 印章工具 | `/stamp` | 印章制作（照片章/手动设计/AI参照制作）与文件盖章 |
| 出口待转移 | `/vehicle-office` | 出口待转移管理平台（从车源管理选择车辆标注转移状态，管理绿本/行驶证/交易发票/临牌等附件） |

### 数据层

| 存储方式 | 说明 |
|---------|------|
| ☁️ 云端 | Supabase PostgreSQL + S3 兼容对象存储，跨设备同步、团队协作 |
| 💻 本地 | 浏览器 localStorage / IndexedDB，仅本设备可用 |

**各模块存储方式**（侧边栏 `cloud` 标记 = 云端保存）：

| 模块 | 路由 | 存储 |
|------|------|------|
| 选车工作台 | `/vehicle-sourcing` | ☁️ Supabase DB |
| 车辆档案/车辆检测 | `/car-inventory` | ☁️ Supabase DB |
| 车况查询 | `/vehicle-query` | ☁️ Supabase DB |
| 配置查询 | `/vin-lookup` | ⚡ 外部 API |
| 出口待转移 | `/vehicle-office` | ☁️ Supabase DB |
| 报价计算器 | `/quote-calculator` | ☁️ Supabase DB（+ localStorage 缓存） |
| 发票合同装箱单 | `/documents` | ☁️ Supabase DB |
| 报关预录 | `/customs-declaration` | ☁️ Supabase DB |
| 印章工具 | `/stamp` | 💻 localStorage |
| 许可证草单 | `/export-license/draft` | ☁️ Supabase DB（+ localStorage 备份） |
| 商务部入口/已签发归档 | `/export-license` | ☁️ Supabase DB + S3 |
| 发票报税 | `/invoice-tax` | ☁️ Supabase DB |
| 税务局导航 | `/tax-bureaus` | ☁️ Supabase DB |
| 发票抬头 | `/invoice-titles` | ☁️ Supabase DB |
| 运输跟踪 | `/tracking` | ☁️ Supabase DB |
| 客户管理 | `/customers` | ☁️ Supabase DB |
| 我的记录 | `/my-records` | ☁️ Supabase DB |
| 用户中心 | `/user-center` | ☁️ Supabase DB |
| 组织设置 | `/settings/organization` | ☁️ Supabase DB |

- `src/lib/invoice-tax/types.ts` - 发票/报税模块类型（InvoiceTitle, TaxBureauFavorite, InvoiceTitleType 等）
- `src/lib/invoice-tax/api-helpers.ts` - 发票/报税 API 鉴权与响应工具
- `src/lib/invoice-tax/client.ts` - 发票抬头、税务局收藏的前端 API client
- `src/lib/data-vehicles.ts` - 车辆品牌、类型、核验逻辑
- `src/lib/data-policies.ts` - 20+国家准入政策数据
- `src/lib/data-shipping.ts` - 港口、运费计算模型
- `src/lib/data-documents.ts` - 8种单证模板
- `src/lib/data-compliance.ts` - 合规文件与指南
- `src/lib/data-tracking.ts` - 海运跟踪运单数据、轨迹节点、状态模型
- `src/lib/export-license/types.ts` - 出口许可证云端类型与 VIN 解析工具
- `src/lib/export-license/api-client.ts` - 已签发许可证云端 CRUD 与文件 URL/下载 client
- `src/lib/export-license/storage.ts` - 出口许可证草单/档案本地存储（草稿仍在本地；已签发许可证的历史数据用于一次性迁移）
- `src/lib/s3.ts` - 服务端 S3 兼容对象存储单例封装（coze-coding-dev-sdk）
- `src/lib/export-pending-transfer/types.ts` - 出口待转移类型定义（ExportPendingTransferRecord, AttachmentRecord, AttachmentCategory 等）
- `src/storage/database/shared/schema.ts` - 数据库表结构定义（含 proforma_invoices、compliance_declarations、customers、admin_users、export_licenses、export_pending_transfers、report_orders、payment_accounts 表）

### 领域模型层（Domain Layer）

统一各单证模块的核心实体类型，定义在 `src/lib/domain/`：

- `src/lib/domain/index.ts` - 统一导出入口
- `src/lib/domain/party.ts` - **Party**（统一交易方）：替代旧三套企业类型（`CompanyInfo` / `DeclarationParty` / `LicensePartyProfile`），通过 `PartyRole` 区分卖方/买方/发货人/收货人/生产单位
- `src/lib/domain/vehicle.ts` - **Vehicle**（分层车辆类型）：`VehicleBase`（共用）→ `VehicleSpecs`（混入规格）→ `TradeVehicle`（发票/合同/装箱单）、`CustomsVehicle`（报关单）、`LicenseVehicle`（许可证附加表）、`ComplianceVehicle`（准入声明）
- `src/lib/domain/doc-ref.ts` - **DocRef**（跨单证引用）：替代裸字符串的跨单证引用，保留冗余字段（`contractNo` 等）用于预览/打印
- `src/lib/doc-linkage/index.ts` - **DocLinkage**（跨单证联动）：定义单证间引用关系、URL 导航解析、编辑页跳转。已被 `SourcePicker` 使用，支持报关单→合同/许可证跳转

**设计原则**：各单证模块新增/修改类型时，优先复用 `src/lib/domain/` 中的基础类型，避免重复定义。旧类型（`CompanyInfo`、膨胀的 `VehicleItem`）已标记 `@deprecated`，现存代码仍可继续使用，新功能请使用 domain 类型。

**迁移状态**：
- `CompanyInfo` → `Party`：`CompanyProfilePicker` / `BuyerProfilePicker` 已用 DB `company_profiles` 表
- `DeclarationParty` → `Party`：`ConsignorPicker` / `ConsigneePicker` 已用 DB
- `LicensePartyProfile` → `Party`：`LicensePartyPicker` 已迁移到 DB（`company_profiles` API）
- `VehicleItem` → 分层 Vehicle：`vehicle-linkage/mappings.ts` 已添加领域类型对照表
- `DeclarationGoodsItem` → `CustomsVehicle`：已标记 `@deprecated`

### 报价计算器（可视化公式列表）

用户以**顺序列表**组织"具名单元格"卡片（数组顺序即展示顺序，支持 ↑↓ 按钮与手柄拖拽两种排序方式）。**交互分区**：左侧列表是"纯计算器"——数字格直接录入数字、公式格只展示计算结果、备注格展示文本，公式文本不在左侧出现；选中单元格后在右侧编辑面板的"内容"统一输入框中编写公式/改数字/写备注。系统自动识别内容类型：纯数字→数字格、`=` 开头或含运算符+引用名→公式格、其余文本→备注格（`'` 前缀强制备注），用户无需手动选类型；卡片徽标实时展示识别结果。公式中输入 `@` 引用其它格子（自动联想名称，Tab/回车插入；`@` 为引用标记，求值时等价于直接写名称，如 `@车价*3%`），直接写中文名称也可引用；引用未定义名称报 #NAME 错误；备注格文本也可被公式引用（如 `IF(目的国="尼日利亚",100,200)`）。自研引擎实时联动求值。存储层保持 `{kind, value, formula}` 结构不变，分类是纯 UI 层逻辑（classify.ts）。旧版"对话式规则解析 + 嵌入代码导出"方案已整体删除；自由画布（x/y 坐标+拖动）方案已按需求移除，CalcCell 不再含坐标字段（云端旧数据中残留的 x/y 字段读取时自动忽略）。

**自研公式引擎**（`src/lib/quote-calculator/engine/`，纯 TS 零依赖）：
- `types.ts` - 引擎类型（CellValue、FormulaError、Token 带位置、AST 节点）
- `tokenizer.ts` - 词法分析（连续非终止符=标识符，天然支持中文变量名；全角符号归一化）
- `parser.ts` - 递归下降解析（比较<&连接<加减<乘除<乘方<一元<%）、`extractRefs`、`renameReferences`（改名整词替换公式引用）
- `functions.ts` - 22 个内置函数（SUM/ROUND/IF/IFERROR/AND/OR/CONCAT 等，IF 惰性求值）
- `evaluate.ts` - AST 求值（除零/类型错误检查）
- `index.ts` - `computeAll`（Kahn 拓扑排序 + 循环引用检测 + #REF 错误传播）、`isValidName`、`normalizeName`（名称允许含空格，引用/重名判定/改名传播一律按去空白形态匹配，如名称"车辆 成本"在公式中写作 `车辆成本`）

**数据与存储**（云端结构 `{v:2, cells}`，旧数组格式 v1 已弃用、读取时过滤）：
- `src/lib/quote-calculator/types.ts` - CalcCell/VisualCalculator/createDefaultCells（二手车出口报价模板）/formatCellValue/CELL_KIND_LABELS（数字/公式/备注）
- `src/lib/quote-calculator/classify.ts` - 内容自动分类器（classifyContent 七规则：空→数字、`'`前缀→备注、`=`/`＝`开头→公式、含`@`→公式（引用标记）、纯数字→数字、语法字符+指示字符→公式、其余→备注；getCellContent 还原可编辑内容）
- `src/lib/quote-calculator/storage.ts` - localStorage v2 键 + 云端 items 解析/序列化/合并（mergeCalculators 按 updatedAt 比较）
- `src/lib/quote-calculator/api-client.ts` - 云端 CRUD client

**UI 组件**：
- `src/app/(dashboard)/quote-calculator/page.tsx` - 主页面（工具栏+顺序列表+属性面板，本地自动保存+云端同步，方案行内重命名，删除方案走回收站/删除单元格带引用智能提醒）
- `src/components/quote-calculator/cell-list.tsx` - 顺序列表（垂直排列卡片、单"添加单元格"按钮、空态引导、armedId/dragId 拖拽排序状态）
- `src/components/quote-calculator/cell-card.tsx` - 列表行卡片（左侧纯计算器：数字格录入数字、公式格只展示结果、备注格展示文本；类型徽标、拖拽手柄+↑↓按钮）
- `src/components/quote-calculator/cell-editor.tsx` - 右侧编辑面板（内容统一输入——公式在这里编写，@联想/自动识别提示/改名自动传播引用/格式/强调色/删除）
- `src/components/quote-calculator/content-input.tsx` - 统一内容输入（自适应 textarea + `@` 触发的单元格引用联想下拉，名称片段也联想，Tab/回车插入，未定义名称由引擎报 #NAME；公式中被引用的名称以强调色显示，采用背景层高亮+透明文本域实现）

### 车辆采购

- `src/lib/procurement/types.ts` - 采购合同类型定义（BuyerInfo, SellerInfo, VehicleInfo, PaymentInfo, CustomTerm, ContractAttachment, ProcurementContract, ProcurementContractInput 等）
- `src/lib/procurement/api-client.ts` - 前端 API Client（合同 CRUD、签署文件上传/下载、附件上传/预览/删除）
- `src/app/(dashboard)/procurement/page.tsx` - 合同列表页（搜索/筛选/状态标签/新建入口）
- `src/app/(dashboard)/procurement/new/page.tsx` - 新建合同页（分步表单：买方→卖方→车辆→收款→自定义条款）
- `src/app/(dashboard)/procurement/[id]/page.tsx` - 合同详情/编辑页（信息编辑+签署文件上传+附件管理+打印预览入口）
- `src/app/(dashboard)/procurement/[id]/preview/page.tsx` - 合同打印预览页（A4排版+浏览器打印导出PDF）
- `src/app/api/procurement/route.ts` - 合同列表(GET)与创建(POST)
- `src/app/api/procurement/[id]/route.ts` - 合同详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/procurement/[id]/signed-file/route.ts` - 签署文件上传(POST, multipart/form-data)
- `src/app/api/procurement/[id]/signed-file-url/route.ts` - 签署文件签名URL(GET)
- `src/app/api/procurement/[id]/attachments/route.ts` - 附件上传(POST, multipart/form-data)
- `src/app/api/procurement/[id]/attachments/[attachmentId]/route.ts` - 附件删除(DELETE)
- `src/app/api/procurement/[id]/attachments/[attachmentId]/file-url/route.ts` - 附件签名URL(GET)

### 印章工具

- `src/lib/stamp/types.ts` - 印章类型定义（StampShape, ManualStampConfig, ArcTextConfig, LineTextConfig, CenterContent, SavedStamp, STANDARD_SIZES 等）
- `src/lib/stamp/renderer.ts` - Canvas 印章渲染引擎（drawManualStamp 函数，支持圆形/椭圆/方形，弧形文字，中心图案）
- `src/lib/stamp/storage.ts` - 印章 localStorage 存储（保存/加载/删除印章）
- `src/lib/stamp/photo-processor.ts` - 照片去背景处理（Canvas 像素操作，提取印章红色/蓝色）
- `src/app/(dashboard)/stamp/page.tsx` - 印章库主页面（列表+三种创建入口）
- `src/app/(dashboard)/stamp/create/photo/page.tsx` - 照片章上传页面（上传+去背景+预览+保存）
- `src/app/(dashboard)/stamp/create/manual/page.tsx` - 手动设计器页面（全维度配置+Canvas实时预览）
- `src/app/(dashboard)/stamp/create/reference/page.tsx` - AI参照制作页面（上传参考图+AI识别+预览+微调+保存）
- `src/app/(dashboard)/stamp/use/page.tsx` - 盖章页面（选印章+上传PDF+拖拽定位+导出）
- `src/app/api/stamp/analyze/route.ts` - AI印章分析 API（POST，接收参考图，调用 LLM 视觉能力识别印章元素，返回 ManualStampConfig）

### 管理员认证体系（独立于用户端）

- `src/lib/admin/auth.ts` - 管理员认证工具（密码哈希、会话令牌、Cookie 管理）
- `src/app/api/admin/auth/route.ts` - 管理员认证 API（POST 登录/GET 验证/DELETE 登出/PUT 改密）
- `src/app/admin/login/page.tsx` - 管理员登录页面（独立视觉设计）
- `src/app/admin/layout.tsx` - 管理后台布局（服务端 AdminGuard 权限校验）
- `src/components/admin-sidebar.tsx` - 管理后台侧边栏导航

**默认管理员账户**：`admin@exportdrive.com` / `admin123`

**认证机制**：
- 使用 Node.js crypto.scrypt 进行密码哈希
- 使用 HMAC-SHA256 签名会话令牌，存储在 httpOnly Cookie 中
- 管理后台所有页面通过服务端 AdminGuard 校验会话有效性
- 与用户端 Supabase Auth 完全隔离，互不影响

### 组织账户体系（多租户）

- `src/lib/org/types.ts` - 组织系统类型定义（Organization, OrganizationMember, OrganizationRole, PermissionConfig 等）
- `src/lib/org/permissions.ts` - 权限定义与校验工具（预设角色权限模板、模块权限检查）
- `src/lib/org/service.ts` - 组织服务端工具（CRUD、成员管理、邀请管理）
- `src/lib/org/context.tsx` - React 组织上下文 Provider（OrgProvider）
- `src/lib/org/hooks.ts` - React Hooks（useOrg, useModulePermission, useIsAdmin 等）
- `src/lib/org/index.ts` - 组织系统统一导出

**数据库表**：
- `organizations` - 企业/租户（名称、套餐、成员上限、状态）
- `organization_members` - 成员关系（用户+组织+角色+状态）
- `organization_roles` - 角色定义（系统预设+自定义，含权限 JSON）
- `organization_invitations` - 邀请记录（邮箱+角色+令牌+过期时间）

**预设角色**：
- `owner` - 企业所有者，全部权限
- `admin` - 管理员，可管理成员和设置
- `operator` - 操作员，可操作业务数据
- `viewer` - 只读成员，仅可查看

**数据隔离**：所有业务表（proforma_invoices, compliance_declarations, customers 等）均含 `organization_id` 字段，按组织严格隔离。

**API 路由**：
- `GET/POST /api/organizations` - 组织列表/创建
- `GET/PUT/DELETE /api/organizations/[id]` - 组织详情/更新/删除
- `GET/POST /api/organizations/[id]/members` - 成员列表/邀请
- `PUT/DELETE /api/organizations/[id]/members/[mid]` - 成员变更/移除
- `GET/POST /api/organizations/[id]/roles` - 角色列表/创建
- `PUT/DELETE /api/organizations/[id]/roles/[rid]` - 角色更新/删除
- `GET/POST /api/organizations/current` - 当前组织上下文
- `GET/POST /api/invitations/[token]` - 查看/接受邀请

### 主题系统（亮色/暗色模式）

- `src/components/theme-provider.tsx` - 主题 Provider（基于 next-themes，支持 system/light/dark）
- `src/components/theme-toggle.tsx` - 用户端主题切换按钮（右上角）
- `src/app/admin/admin-theme-toggle.tsx` - 管理后台主题切换按钮
- `src/app/globals.css` - CSS 变量定义（`:root` 亮色 + `.dark` 暗色）
- 主题切换通过 `<html>` 的 `.dark` class 控制
- 品牌色（navy/orange/success）通过 CSS 变量 `--brand-*` 在两种主题间切换
- 切换时添加 `.theme-transition` class 实现平滑过渡动画

### 全局认证系统（AuthProvider）

- `src/lib/auth-context.tsx` - 全局 Auth Provider，Supabase auth 状态单例化
- `src/components/auth-guard.tsx` - Dashboard 认证守卫（读取全局 auth，首次加载骨架屏，后续导航即时渲染）

- Provider 层级：`ThemeProvider > SupabaseConfigProvider > AuthProvider > OrgProvider`
- 所有页面通过 `import { useAuth } from '@/lib/auth-context'` 获取全局 auth 状态
- Auth 状态在 root layout 中只初始化一次，后续页面导航直接读取内存缓存
- 侧边栏在挂载时自动 `router.prefetch()` 预取所有导航路由的 JS chunk

### API 路由

- `src/app/api/proforma-invoices/route.ts` - 形式发票列表(GET)与创建(POST)
- `src/app/api/proforma-invoices/[id]/route.ts` - 形式发票详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/compliance-declarations/route.ts` - 准入声明列表(GET)与创建(POST)
- `src/app/api/compliance-declarations/[id]/route.ts` - 准入声明详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/blog-posts/route.ts` - 博客文章列表(GET, 支持分页/状态/标签过滤)与创建(POST, 需登录)
- `src/app/api/blog-posts/[id]/route.ts` - 博客文章详情(GET, 支持ID或slug查询)、更新(PUT)、删除(DELETE)
- `src/app/api/supabase-config/route.ts` - Supabase 客户端配置
- `src/app/api/customers/route.ts` - 客户列表(GET, 支持分页/状态/国家/搜索过滤)与创建(POST)
- `src/app/api/customers/[id]/route.ts` - 客户详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/payment-accounts/route.ts` - 常用收款信息列表(GET，支持搜索/组织过滤)与创建(POST，可设默认，title/content 必填)
- `src/app/api/payment-accounts/[id]/route.ts` - 常用收款信息详情(GET)、更新(PUT，可改默认)、删除(DELETE)；供形式发票「收款信息」栏保存与一键复用
- `src/app/api/admin/auth/route.ts` - 管理员认证（POST 登录/GET 验证/DELETE 登出/PUT 改密）
- `src/app/api/quote-calculators/route.ts` - 可视化计算器列表(GET)与创建(POST，items 为 {v:2,cells})
- `src/app/api/quote-calculators/[id]/route.ts` - 可视化计算器详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/stamp/analyze/route.ts` - AI印章分析（POST，接收参考图base64，LLM视觉识别印章元素，返回ManualStampConfig）
- `src/app/api/invoice-titles/route.ts` - 发票抬头列表(GET，支持类型/搜索分页)与创建(POST)
- `src/app/api/invoice-titles/[id]/route.ts` - 发票抬头详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/tax-bureaus/route.ts` - 税务局收藏列表(GET，支持类型/地区/搜索)与创建(POST)
- `src/app/api/tax-bureaus/[id]/route.ts` - 税务局收藏详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/export-licenses/route.ts` - 已签发出口许可证列表(GET，支持 VIN/许可证号/出口商/文件名/备注搜索)与上传(POST, multipart/form-data)
- `src/app/api/export-licenses/[id]/route.ts` - 许可证详情(GET)、更新(PUT，可换文件)、删除(DELETE)
- `src/app/api/export-licenses/[id]/file-url/route.ts` - 换取许可证文件的临时签名 URL(GET，1小时有效，供预览/下载)
- `src/app/api/export-pending-transfer/route.ts` - 出口待转移列表(GET)与创建(POST)
- `src/app/api/export-pending-transfer/[id]/route.ts` - 出口待转移详情(GET)、更新(PUT)、删除(DELETE)
- `src/app/api/export-pending-transfer/[id]/attachments/route.ts` - 附件上传(POST, multipart/form-data)
- `src/app/api/export-pending-transfer/[id]/attachments/[attachmentId]/route.ts` - 附件签名URL(GET)与删除(DELETE)
- `src/app/api/vehicle-inspection/init-query/route.ts` - 车况查询初始化(POST，创建临时车辆+报告订单组合)
- `src/app/api/vehicle-inspection/report-orders/[id]/route.ts` - 报告订单详情(GET)、更新(PUT)
- `src/app/api/vehicle-inspection/save-temp-vehicle/route.ts` - 保存临时车辆为正式档案(POST，含VIN去重/合并)
- `src/app/api/vehicle-inspection/vin-check/route.ts` - VIN重复检查(GET)
- `src/lib/vehicle-inspection/report-orders.ts` - 报告订单类型定义（ReportOrder, CreateReportCombinationPayload, ReportOrderStatus, FinancialStatus）
- `src/lib/vehicle-inspection/report-order-service.ts` - 报告订单服务端工具（创建/更新/查询报告订单，VIN去重）
- `src/lib/vehicle-inspection/report-order-client.ts` - 前端 API Client（initQuery, checkVin, saveTempVehicle, getReportOrder, updateReportOrder）

### SEO 相关

- `src/app/sitemap.ts` - 动态 sitemap 生成（含静态页+已发布博客文章）
- `src/app/robots.ts` - 爬虫规则（允许博客页，禁止管理后台）
- `src/app/blog/` - 博客前端展示（SSR，含 JSON-LD 结构化数据、Open Graph、动态 metadata）

### 版本技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19
- **Language**: TypeScript 5
- **UI 组件**: shadcn/ui (基于 Radix UI)
- **Styling**: Tailwind CSS 4

## 目录结构

```
├── public/                 # 静态资源
├── scripts/                # 构建与启动脚本
│   ├── build.sh            # 构建脚本
│   ├── dev.sh              # 开发环境启动脚本
│   ├── prepare.sh          # 预处理脚本
│   └── start.sh            # 生产环境启动脚本
├── src/
│   ├── app/                # 页面路由与布局
│   ├── components/ui/      # Shadcn UI 组件库
│   ├── components/
│   │   ├── theme-provider.tsx   # 主题 Provider（基于 next-themes）
│   │   ├── theme-toggle.tsx     # 主题切换按钮（亮色/暗色）
│   │   ├── sidebar-nav.tsx      # 用户端侧边栏导航
│   │   └── admin-sidebar.tsx    # 管理后台侧边栏导航
│   ├── hooks/              # 自定义 Hooks
│   ├── lib/                # 工具库
│   │   ├── utils.ts        # 通用工具函数 (cn)
│   │   ├── admin/          # 管理员认证体系（独立于用户端）
│   │   ├── data-vehicles.ts    # 车辆数据与核验逻辑
│   │   ├── data-policies.ts    # 各国准入政策数据
│   │   ├── data-shipping.ts    # 运费测算数据
│   │   ├── data-documents.ts   # 单证模板数据
│   │   └── data-compliance.ts  # 合规文件数据
│   └── server.ts           # 自定义服务端入口
├── next.config.ts          # Next.js 配置
├── package.json            # 项目依赖管理
└── tsconfig.json           # TypeScript 配置
```

- 项目文件（如 app 目录、pages 目录、components 等）默认初始化到 `src/` 目录下。

## 包管理规范

**仅允许使用 pnpm** 作为包管理器，**严禁使用 npm 或 yarn**。
**常用命令**：
- 安装依赖：`pnpm add <package>`
- 安装开发依赖：`pnpm add -D <package>`
- 安装所有依赖：`pnpm install`
- 移除依赖：`pnpm remove <package>`

## 开发规范

### 编码规范

- 默认按 TypeScript `strict` 心智写代码；优先复用当前作用域已声明的变量、函数、类型和导入，禁止引用未声明标识符或拼错变量名。
- 禁止隐式 `any` 和 `as any`；函数参数、返回值、解构项、事件对象、`catch` 错误在使用前应有明确类型或先完成类型收窄，并清理未使用的变量和导入。

### next.config 配置规范

- 配置的路径不要写死绝对路径，必须使用 path.resolve(__dirname, ...)、import.meta.dirname 或 process.cwd() 动态拼接。

### Hydration 问题防范

1. 严禁在 JSX 渲染逻辑中直接使用 typeof window、Date.now()、Math.random() 等动态数据。**必须使用 'use client' 并配合 useEffect + useState 确保动态内容仅在客户端挂载后渲染**；同时严禁非法 HTML 嵌套（如 <p> 嵌套 <div>）。
2. **禁止使用 head 标签**，优先使用 metadata，详见文档：https://nextjs.org/docs/app/api-reference/functions/generate-metadata
   1. 三方 CSS、字体等资源可在 `globals.css` 中顶部通过 `@import` 引入或使用 next/font
   2. preload, preconnect, dns-prefetch 通过 ReactDOM 的 preload、preconnect、dns-prefetch 方法引入
   3. json-ld 可阅读 https://nextjs.org/docs/app/guides/json-ld

## UI 设计与组件规范 (UI & Styling Standards)

- 模板默认预装核心组件库 `shadcn/ui`，位于`src/components/ui/`目录下
- Next.js 项目**必须默认**采用 shadcn/ui 组件、风格和规范，**除非用户指定用其他的组件和规范。**

## 团队协同开发规范

### 核心原则：部署前必须先同步

多对话（worktree）模式下，每个对话有独立的工作区。**部署只会部署当前工作区的代码**，不会自动合并其他对话的改动。如果多人先后部署，后部署的会覆盖先部署的。

### 协同三步走

```
开发前同步 → 独立开发 → 部署前检查
```

#### 1. 开发前同步

每次开始写代码前，确保工作区代码是最新的：

```bash
git pull origin main
```

#### 2. 独立开发

在自己的工作区正常编写代码。

#### 3. 部署前检查（必须执行）

```bash
bash scripts/pre-deploy-check.sh
```

脚本会自动：
- 检查未提交的本地改动
- 拉取远程最新代码
- 检测是否有他人新提交
- 自动合并（无冲突时）或提示手动解决（有冲突时）

### 分支策略

- `main`：稳定分支，始终与已部署版本一致
- `feature/xxx`：大功能分支，完成后合并回 main

### 冲突处理

如果部署前检查发现冲突：
1. 脚本会列出冲突文件
2. 手动解决冲突
3. `git add . && git commit` 提交合并
4. 再次运行 `bash scripts/pre-deploy-check.sh` 确认
5. 确认无误后部署

### 最佳实践

- **小步快跑**：改完一个小功能就部署，不要攒一大堆
- **先同步再动手**：每次开始写代码前先 `git pull`
- **部署前必检查**：养成 `bash scripts/pre-deploy-check.sh` 的习惯
- **沟通先行**：改同一个模块前，先和团队沟通

详见 `docs/COLLABORATION.md`。
