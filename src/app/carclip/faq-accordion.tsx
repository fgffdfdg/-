'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

const faqs = [
  {
    id: 'faq-1',
    question: 'CarClip 支持哪些网站？',
    answer:
      '目前 CarClip 支持<strong>汽车之家（autohome.com.cn）二手车频道</strong>的详情页。我们正在扩展对更多二手车平台的支持，包括懂车帝、瓜子二手车等，敬请期待。',
  },
  {
    id: 'faq-2',
    question: '提取的信息准确吗？',
    answer:
      'CarClip 基于页面结构化数据提取，能够精准识别汽车之家详情页中的车辆参数区域，<strong>准确率达 95% 以上</strong>。对于极少数页面结构异常的车辆，提取结果的字段可能有缺失，我们持续优化识别算法。',
  },
  {
    id: 'faq-3',
    question: '翻译质量如何？',
    answer:
      'CarClip 采用<strong>专业汽车术语库 + AI 翻译引擎</strong>双重保障。核心术语如「前置前驱」→「Front-Wheel Drive (FWD)」、「涡轮增压」→「Turbocharged」、「非承载式车身」→「Body-on-Frame」等均由行业专家校对，确保海外买家准确理解车辆配置。',
  },
  {
    id: 'faq-4',
    question: '是否免费？',
    answer:
      '<strong>基础功能完全免费</strong>，包括车辆信息提取、英文翻译和一键复制。高级功能（如批量提取、历史记录管理、多语言翻译等）即将推出，届时将提供灵活的付费方案。',
  },
  {
    id: 'faq-5',
    question: '如何安装？',
    answer:
      '点击页面上的「安装扩展」按钮即可跳转至 Chrome 应用商店，点击「添加至 Chrome」即可完成安装。安装完成后，浏览器工具栏会出现 CarClip 图标，在汽车之家浏览车源时点击图标即可使用。',
  },
];

export function FaqAccordion() {
  const [openId, setOpenId] = useState<string | null>('faq-1');

  const toggle = (id: string) => {
    setOpenId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-3">
      {faqs.map((faq) => {
        const isOpen = openId === faq.id;
        return (
          <div
            key={faq.id}
            className="bg-card rounded-lg shadow-card border border-border/10 overflow-hidden"
          >
            <button
              onClick={() => toggle(faq.id)}
              className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-muted/30 transition-colors"
            >
              <span className="text-sm font-semibold text-foreground pr-4">
                {faq.question}
              </span>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 shrink-0 ${
                  isOpen ? 'rotate-180' : ''
                }`}
              />
            </button>
            <div
              className={`overflow-hidden transition-all duration-200 ${
                isOpen ? 'max-h-96' : 'max-h-0'
              }`}
            >
              <div className="px-5 pb-4">
                <p
                  className="text-sm text-muted-foreground leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: faq.answer }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}