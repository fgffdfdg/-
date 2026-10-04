/** 维运网承运商数据 - 从 weiyun001.com/track 提取 */

export interface WeiYunShipLine {
  code: string;
  cnName: string;
  enName: string;
  isSupport: boolean;
  isCntrNoSupport: boolean;
  logoPath: string;
  cnWebsite: string;
  enWebsite: string;
}

export interface WeiYunExpress {
  code: string;
  cnName: string;
  enName: string;
  cnUrl: string;
  enUrl: string;
  siteUrl: string;
  logo: string;
}

export interface WeiYunCarriersData {
  shipLines: WeiYunShipLine[];
  expresses: WeiYunExpress[];
}

export interface WeiYunTrackRequest {
  trackingNo: string;
  carrierCode: string;
  carrierType: "ship" | "express";
}