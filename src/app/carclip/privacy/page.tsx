import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "隐私政策 - 汽车出口通｜车源采集与翻译助手",
  description:
    "汽车出口通－车源采集助手（CarClip）隐私政策，说明本扩展处理哪些信息、如何使用信息，以及用户如何管理数据。",
  alternates: {
    canonical: "/carclip/privacy",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function CarClipPrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        <article className="prose prose-slate max-w-none dark:prose-invert prose-headings:text-foreground prose-p:text-muted-foreground prose-a:text-primary prose-strong:text-foreground prose-li:text-muted-foreground">
          <h1>汽车出口通－车源采集助手隐私政策</h1>
          <h1>Privacy Policy for Qiche Chukou – Vehicle Data Collection Assistant</h1>

          <p>
            <strong>生效日期 / Effective Date：2026年8月21日 / August 21, 2026</strong>
            <br />
            <strong>最后更新 / Last Updated：2026年8月21日 / August 21, 2026</strong>
          </p>

          <div className="my-8 border-t border-border" />

          {/* ===== 中文版本 ===== */}
          <h2>一、政策说明</h2>
          <p>
            &ldquo;汽车出口通－车源采集助手&rdquo;（以下简称&ldquo;本扩展&rdquo;）是一款用于车辆信息采集、翻译、复制和图片下载的 Chrome 浏览器扩展。
          </p>
          <p>
            我们重视用户隐私。本隐私政策说明本扩展会处理哪些信息、如何使用这些信息，以及用户可以如何管理相关数据。
          </p>
          <p>
            本扩展的核心功能是在用户主动操作时，从 che168.com 车辆详情页提取公开展示的车辆名称、里程、首次上牌时间、排量、所在地和车辆图片，并在用户设备本地完成英文标准化处理。
          </p>

          <h2>二、本扩展处理的信息</h2>
          <h3>1. 车辆页面内容</h3>
          <p>当用户在支持的车辆详情页主动打开本扩展或执行提取操作时，本扩展可能读取：</p>
          <ul>
            <li>车辆名称；</li>
            <li>车辆里程；</li>
            <li>首次上牌时间；</li>
            <li>发动机排量；</li>
            <li>车辆所在地；</li>
            <li>车辆配置文字；</li>
            <li>车辆图片及图片链接；</li>
            <li>当前车辆页面的网址和页面标题。</li>
          </ul>
          <p>
            这些信息来自用户当前打开的公开车辆页面，仅用于完成用户主动要求的车辆资料提取功能。
          </p>

          <h3>2. 本地偏好设置</h3>
          <p>为了改善使用体验，本扩展可能在用户设备本地保存：</p>
          <ul>
            <li>显示语言；</li>
            <li>语言版本设置；</li>
            <li>悬浮球显示位置；</li>
            <li>其他与界面显示有关的偏好设置。</li>
          </ul>
          <p>这些设置保存在 Chrome 提供的本地存储空间中。</p>

          <h2>三、信息的使用方式</h2>
          <p>本扩展处理的信息仅用于：</p>
          <ul>
            <li>从当前车辆页面提取车辆资料；</li>
            <li>将车辆信息标准化或翻译成英文；</li>
            <li>在扩展侧边栏或悬浮窗口中展示结果；</li>
            <li>根据用户操作复制车辆文字或图文内容；</li>
            <li>根据用户选择下载车辆图片；</li>
            <li>记住用户的语言和界面偏好；</li>
            <li>在用户主动点击时打开汽车出口通工作台。</li>
          </ul>
          <p>
            本扩展不会将提取的车辆资料用于广告、用户画像、信用评估、贷款决策或与扩展功能无关的市场研究。
          </p>

          <h2>四、本地处理与数据传输</h2>
          <p>
            车辆信息的识别、字段转换、词典翻译和拼音转换均在用户设备本地完成。
          </p>
          <p>
            本扩展不会将提取的车辆名称、里程、上牌时间、排量、所在地、图片选择记录或剪贴板内容上传至汽车出口通的服务器。
          </p>
          <p>
            当用户查看或下载车辆图片时，浏览器可能直接向图片所在服务器（例如 autoimg.cn）请求相应图片。这属于浏览器获取网页图片所必需的网络请求。
          </p>
          <p>
            当用户主动点击&ldquo;返回工作台&rdquo;等入口时，浏览器会打开{" "}
            <code>https://qichechukou.cn/</code>
            。除非用户主动访问或使用该网站，本扩展不会自动向该网站提交提取的车辆数据。
          </p>

          <h2>五、Chrome 权限说明</h2>
          <p>本扩展可能使用以下 Chrome 权限：</p>
          <ul>
            <li>
              <strong>activeTab</strong>：在用户主动打开扩展时临时访问当前标签页。
            </li>
            <li>
              <strong>scripting</strong>：在当前支持的车辆页面执行扩展安装包内置的信息提取程序。
            </li>
            <li>
              <strong>storage</strong>：在本地保存语言和界面偏好。
            </li>
            <li>
              <strong>downloads</strong>：在用户点击下载按钮后保存用户选择的车辆图片。
            </li>
            <li>
              <strong>clipboardWrite</strong>：在用户点击复制按钮后，将车辆文字或图文内容写入剪贴板。
            </li>
            <li>
              <strong>sidePanel</strong>：在 Chrome 侧边栏中展示车辆资料和操作界面。
            </li>
            <li>
              <strong>contextMenus</strong>：在支持的网站中提供打开本扩展的右键菜单入口。
            </li>
            <li>
              <strong>主机权限</strong>：访问 che168.com 车辆详情页以及相关图片域名，以读取公开车辆资料和处理车辆图片。
            </li>
          </ul>
          <p>本扩展仅申请实现现有功能所必需的权限。</p>

          <h2>六、信息共享与出售</h2>
          <p>我们不会出售、出租或交易用户数据。</p>
          <p>
            我们不会向第三方分享或转移本扩展处理的车辆页面内容、本地偏好设置或用户操作数据，但法律法规要求、司法机关依法要求或维护扩展安全所必需的情况除外。
          </p>
          <p>
            我们不会将用户数据用于个性化广告、重新定位广告或基于兴趣的广告。
          </p>

          <h2>七、远程代码</h2>
          <p>本扩展不执行远程托管的 JavaScript 或 WebAssembly 代码。</p>
          <p>
            本扩展运行所需的程序代码均包含在提交至 Chrome 应用商店的扩展安装包中。访问网页、加载车辆图片或打开汽车出口通工作台不属于执行远程代码。
          </p>

          <h2>八、数据保存与删除</h2>
          <p>本扩展不会在开发者服务器上保存提取的车辆资料。</p>
          <p>语言设置和悬浮球位置等偏好仅保存在用户设备本地。用户可以通过以下方式删除这些数据：</p>
          <ul>
            <li>清除本扩展的本地存储数据；</li>
            <li>重置扩展设置；</li>
            <li>从 Chrome 浏览器中卸载本扩展。</li>
          </ul>
          <p>卸载扩展后，由本扩展保存在 Chrome 扩展存储空间中的本地数据将被清除。</p>

          <h2>九、数据安全</h2>
          <p>
            我们采取合理措施限制数据处理范围。本扩展仅在用户主动操作时处理当前页面中实现功能所需要的信息。
          </p>
          <p>
            本扩展不会主动收集用户姓名、电话号码、电子邮箱、身份证件、账号密码、支付信息、健康信息或私人通讯内容。
          </p>

          <h2>十、第三方网站</h2>
          <p>
            本扩展可在 che168.com 等第三方网站上运行，并可能访问 autoimg.cn 等车辆图片域名。
          </p>
          <p>
            第三方网站对数据的处理由其自身隐私政策约束。我们不控制第三方网站的内容、数据处理方式或隐私措施。
          </p>

          <h2>十一、Chrome Web Store 用户数据有限使用声明</h2>
          <p>
            本扩展对从 Chrome API 获得的信息的使用和传输，将遵守 Chrome Web Store 用户数据政策，包括&ldquo;有限使用&rdquo;要求。
          </p>
          <p>
            本扩展只会将相关信息用于提供或改进用户可见的车辆资料采集功能，不会将这些信息用于无关用途、个性化广告、信用评估或出售给第三方。
          </p>

          <h2>十二、隐私政策变更</h2>
          <p>
            如本扩展的功能、权限或数据处理方式发生变化，我们可能更新本隐私政策。
          </p>
          <p>
            更新后的政策将在本页面公布，并修改页面顶部的&ldquo;最后更新&rdquo;日期。涉及数据处理方式的重大变化时，我们会通过适当方式向用户说明。
          </p>

          <h2>十三、联系我们</h2>
          <p>
            如果您对本隐私政策或本扩展的数据处理方式有任何疑问，可以通过以下方式联系我们：
          </p>
          <ul>
            <li>
              网站：<a href="https://qichechukou.cn/">https://qichechukou.cn/</a>
            </li>
            <li>
              电子邮箱：<a href="mailto:privacy@qichechukou.cn">privacy@qichechukou.cn</a>
            </li>
          </ul>

          <div className="my-8 border-t border-border" />

          {/* ===== English Version ===== */}
          <h1>English Version</h1>

          <h2>1. Introduction</h2>
          <p>
            &ldquo;Qiche Chukou – Vehicle Data Collection Assistant&rdquo; (&ldquo;the
            Extension&rdquo;) is a Chrome browser extension designed to extract, translate,
            copy, and download publicly displayed vehicle information.
          </p>
          <p>
            This Privacy Policy explains what information the Extension processes, how
            that information is used, and how users can manage locally stored data.
          </p>
          <p>
            The Extension&rsquo;s primary purpose is to extract publicly displayed vehicle
            names, mileage, first-registration dates, engine displacement, location, and
            vehicle images from supported che168.com vehicle detail pages after the user
            initiates the operation.
          </p>

          <h2>2. Information Processed by the Extension</h2>
          <h3>2.1 Vehicle Page Content</h3>
          <p>
            When the user opens the Extension or initiates an extraction operation on a
            supported vehicle detail page, the Extension may process:
          </p>
          <ul>
            <li>Vehicle name;</li>
            <li>Mileage;</li>
            <li>First-registration date;</li>
            <li>Engine displacement;</li>
            <li>Vehicle location;</li>
            <li>Vehicle specification text;</li>
            <li>Vehicle images and image URLs;</li>
            <li>The URL and title of the current vehicle page.</li>
          </ul>
          <p>
            This information is obtained from the public vehicle page currently opened by
            the user and is processed only to provide the requested vehicle-data extraction
            functionality.
          </p>

          <h3>2.2 Local Preferences</h3>
          <p>
            The Extension may store the following preferences locally on the user&rsquo;s
            device:
          </p>
          <ul>
            <li>Display language;</li>
            <li>Language-version settings;</li>
            <li>Floating-button position;</li>
            <li>Other interface-related preferences.</li>
          </ul>
          <p>
            These settings are stored using Chrome&rsquo;s local extension storage.
          </p>

          <h2>3. How Information Is Used</h2>
          <p>Information processed by the Extension is used only to:</p>
          <ul>
            <li>Extract vehicle information from the current page;</li>
            <li>Standardize or translate vehicle information into English;</li>
            <li>
              Display results in the Extension&rsquo;s side panel or floating window;
            </li>
            <li>
              Copy vehicle text or combined text-and-image content at the user&rsquo;s
              request;
            </li>
            <li>Download vehicle images selected by the user;</li>
            <li>Remember language and interface preferences;</li>
            <li>
              Open the Qiche Chukou Workbench when requested by the user.
            </li>
          </ul>
          <p>
            The Extension does not use extracted information for advertising, user
            profiling, credit assessment, lending decisions, or unrelated market research.
          </p>

          <h2>4. Local Processing and Data Transmission</h2>
          <p>
            Vehicle field recognition, text conversion, dictionary-based translation, and
            Pinyin conversion are performed locally on the user&rsquo;s device.
          </p>
          <p>
            The Extension does not upload extracted vehicle names, mileage, registration
            dates, engine displacement, location, image selections, or clipboard content
            to Qiche Chukou servers.
          </p>
          <p>
            When a user views or downloads a vehicle image, the browser may request that
            image directly from its hosting server, such as autoimg.cn. This is a necessary
            network request for retrieving the selected webpage image.
          </p>
          <p>
            When a user deliberately clicks an entry such as &ldquo;Open Workbench,&rdquo;
            the browser opens <code>https://qichechukou.cn/</code>. The Extension does not
            automatically submit extracted vehicle information to that website.
          </p>

          <h2>5. Chrome Permission Usage</h2>
          <p>The Extension may use the following Chrome permissions:</p>
          <ul>
            <li>
              <strong>activeTab:</strong> Temporarily accesses the active tab after the user
              opens the Extension.
            </li>
            <li>
              <strong>scripting:</strong> Runs packaged extraction logic on the current
              supported vehicle page.
            </li>
            <li>
              <strong>storage:</strong> Stores language and interface preferences locally.
            </li>
            <li>
              <strong>downloads:</strong> Saves vehicle images selected by the user.
            </li>
            <li>
              <strong>clipboardWrite:</strong> Copies vehicle text or text-and-image content
              after the user clicks a copy button.
            </li>
            <li>
              <strong>sidePanel:</strong> Displays vehicle information and controls in the
              Chrome side panel.
            </li>
            <li>
              <strong>contextMenus:</strong> Adds an entry for opening the Extension from
              the context menu.
            </li>
            <li>
              <strong>Host permissions:</strong> Accesses supported che168.com vehicle pages
              and related image domains to process publicly displayed vehicle information
              and images.
            </li>
          </ul>
          <p>
            The Extension requests only the permissions necessary for its existing features.
          </p>

          <h2>6. Sharing and Sale of Information</h2>
          <p>We do not sell, rent, or trade user data.</p>
          <p>
            We do not share or transfer vehicle page content, local preferences, or
            user-operation data processed by the Extension to third parties, except when
            required by applicable law, a lawful authority, or when reasonably necessary
            to protect the security of the Extension.
          </p>
          <p>
            We do not use user data for personalized, retargeted, or interest-based
            advertising.
          </p>

          <h2>7. Remote Code</h2>
          <p>
            The Extension does not execute remotely hosted JavaScript or WebAssembly code.
          </p>
          <p>
            All executable program code required by the Extension is included in the
            extension package submitted to the Chrome Web Store. Accessing webpages,
            loading vehicle images, or opening the Qiche Chukou Workbench does not
            constitute the execution of remote code.
          </p>

          <h2>8. Data Retention and Deletion</h2>
          <p>
            The Extension does not retain extracted vehicle information on
            developer-controlled servers.
          </p>
          <p>
            Language settings, floating-button position, and similar preferences are stored
            only on the user&rsquo;s device. Users may delete this information by:
          </p>
          <ul>
            <li>Clearing the Extension&rsquo;s local storage;</li>
            <li>Resetting the Extension&rsquo;s settings; or</li>
            <li>Uninstalling the Extension from Chrome.</li>
          </ul>
          <p>
            Local data stored in the Extension&rsquo;s Chrome storage area will be removed
            when the Extension is uninstalled.
          </p>

          <h2>9. Data Security</h2>
          <p>
            We take reasonable measures to limit data processing to the information
            required for the Extension&rsquo;s user-facing features.
          </p>
          <p>
            The Extension does not intentionally collect names, telephone numbers, email
            addresses, government identification numbers, account passwords, payment
            information, health information, or private communications.
          </p>

          <h2>10. Third-Party Websites</h2>
          <p>
            The Extension may operate on third-party websites such as che168.com and may
            access vehicle image domains such as autoimg.cn.
          </p>
          <p>
            Data processing performed by those third-party websites is governed by their
            own privacy policies. We do not control their content, data practices, or
            privacy protections.
          </p>

          <h2>11. Chrome Web Store Limited Use Disclosure</h2>
          <p>
            The Extension&rsquo;s use and transfer of information received from Chrome
            APIs will comply with the Chrome Web Store User Data Policy, including the
            Limited Use requirements.
          </p>
          <p>
            Such information will be used only to provide or improve the Extension&rsquo;s
            user-facing vehicle-data collection functionality and will not be used for
            unrelated purposes, personalized advertising, credit assessment, or sale to
            third parties.
          </p>

          <h2>12. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy if the Extension&rsquo;s features,
            permissions, or data-processing practices change.
          </p>
          <p>
            The updated policy will be published on this page, and the &ldquo;Last
            Updated&rdquo; date will be revised accordingly. Material changes will be
            communicated through an appropriate notice.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have questions about this Privacy Policy or the Extension&rsquo;s data
            practices, please contact us:
          </p>
          <ul>
            <li>
              Website:{" "}
              <a href="https://qichechukou.cn/">https://qichechukou.cn/</a>
            </li>
            <li>
              Email:{" "}
              <a href="mailto:privacy@qichechukou.cn">privacy@qichechukou.cn</a>
            </li>
          </ul>
        </article>
      </div>
    </div>
  );
}