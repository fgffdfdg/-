import type { CustomsCodeItem } from './types';

/**
 * HS 商品编码（10位）- 二手车出口常见类目
 *
 * 数据来源：《中华人民共和国进出口税则》。
 * 仅收录第 87 章车辆相关常用编码，用户可通过"代码表维护"补充。
 */
export const HS_CODES: CustomsCodeItem[] = [
  // 8703 - 主要用于载人的机动车辆
  { code: '8703100000', name: '雪地行走专用车;高尔夫球车及类似车辆', alias: 'snowmobile golf cart xuedi gaoerfu', group: '87.03 载人机动车' },
  { code: '8703210000', name: '1升≤排量≤1.5升小轿车(≤1000cc)', alias: 'sedan 1.0L xiaojiaoche', group: '87.03 载人机动车' },
  { code: '8703220000', name: '1.5升<排量≤2升小轿车', alias: 'sedan 1.5-2.0L xiaojiaoche', group: '87.03 载人机动车' },
  { code: '8703230000', name: '2升<排量≤3升小轿车', alias: 'sedan 2-3L xiaojiaoche', group: '87.03 载人机动车' },
  { code: '8703240000', name: '排量>3升小轿车', alias: 'sedan >3L xiaojiaoche', group: '87.03 载人机动车' },
  { code: '8703310000', name: '1升≤排量≤1.5升越野车(≤1000cc)', alias: 'suv 1.0L yueyeche', group: '87.03 载人机动车' },
  { code: '8703320000', name: '1.5升<排量≤2升越野车', alias: 'suv 1.5-2L yueyeche', group: '87.03 载人机动车' },
  { code: '8703330000', name: '2升<排量≤3升越野车', alias: 'suv 2-3L yueyeche', group: '87.03 载人机动车' },
  { code: '8703340000', name: '排量>3升越野车', alias: 'suv >3L yueyeche', group: '87.03 载人机动车' },
  { code: '8703400000', name: '1升≤排量≤1.5升小客车(≤9座,≤1000cc)', alias: 'minivan 1.0L xiaokeche', group: '87.03 载人机动车' },
  { code: '8703500000', name: '1.5升<排量≤2升小客车(≤9座)', alias: 'minivan 1.5-2L xiaokeche', group: '87.03 载人机动车' },
  { code: '8703600000', name: '2升<排量≤3升小客车(≤9座)', alias: 'minivan 2-3L xiaokeche', group: '87.03 载人机动车' },
  { code: '8703700000', name: '排量>3升小客车(≤9座)', alias: 'minivan >3L xiaokeche', group: '87.03 载人机动车' },
  { code: '8703800010', name: '纯电动乘用车(10座及以下)', alias: 'BEV passenger chundian dong chengkeyongche', group: '87.03 载人机动车' },
  { code: '8703801010', name: '插电式混合动力乘用车(10座及以下)', alias: 'PHEV passenger chadianshi hunhe dongli', group: '87.03 载人机动车' },
  { code: '8703802010', name: '增程式电动乘用车(10座及以下)', alias: 'EREV passenger zengchengshi diandong', group: '87.03 载人机动车' },
  { code: '8703809010', name: '其他新能源乘用车(10座及以下)', alias: 'other NEV passenger qita xinnengyuan', group: '87.03 载人机动车' },
  { code: '8703900000', name: '其他主要用于载人的机动车', alias: 'other passenger vehicle qita zairen', group: '87.03 载人机动车' },
  // 8704 - 货运机动车
  { code: '8704210000', name: '柴油轻型货车(总重≤5吨)', alias: 'diesel light truck chaiyou qingxing huoche', group: '87.04 货运机动车' },
  { code: '8704220000', name: '柴油中型货车(5<总重<20吨)', alias: 'diesel medium truck zhongxing huoche', group: '87.04 货运机动车' },
  { code: '8704230000', name: '柴油重型货车(总重≥20吨)', alias: 'diesel heavy truck zhongxing huoche', group: '87.04 货运机动车' },
  { code: '8704310000', name: '汽油轻型货车(总重≤5吨)', alias: 'gasoline light truck qingyou qingxing', group: '87.04 货运机动车' },
  { code: '8704320000', name: '汽油重型货车(总重>5吨)', alias: 'gasoline heavy truck qingyou zhongxing', group: '87.04 货运机动车' },
  { code: '8704900000', name: '其他货运机动车', alias: 'other truck qita huoche', group: '87.04 货运机动车' },
  // 8705 - 特殊用途机动车
  { code: '8705100000', name: '起重车', alias: 'crane qizhongche', group: '87.05 特殊用途车' },
  { code: '8705200000', name: '钻探车', alias: 'drilling truck zuantanche', group: '87.05 特殊用途车' },
  { code: '8705300000', name: '消防车', alias: 'fire truck xiaofangche', group: '87.05 特殊用途车' },
  { code: '8705400000', name: '混凝土搅拌车', alias: 'concrete mixer hunningtu jiaobanche', group: '87.05 特殊用途车' },
  { code: '8705900000', name: '其他特殊用途机动车', alias: 'other special purpose qita tezhong yongtu', group: '87.05 特殊用途车' },
  // 8702 - 客运机动车（10座及以上）
  { code: '8702100000', name: '大型客运车(座位≥20)', alias: 'large bus dayun keyongche', group: '87.02 客运机动车' },
  { code: '8702200000', name: '中型客运车(10≤座位<20)', alias: 'mid bus zhongxing keyongche', group: '87.02 客运机动车' },
  { code: '8702300000', name: '小型客运车(10≤座位≤19,汽油)', alias: 'small bus xiaoxing keyongche', group: '87.02 客运机动车' },
  { code: '8702900000', name: '其他客运机动车', alias: 'other bus qita keyongche', group: '87.02 客运机动车' },
  // 8711 - 摩托车
  { code: '8711100000', name: '50cc及以下摩托车', alias: 'motorcycle ≤50cc motuoche', group: '87.11 摩托车' },
  { code: '8711200000', name: '50-250cc摩托车', alias: 'motorcycle 50-250cc motuoche', group: '87.11 摩托车' },
  { code: '8711300000', name: '250-500cc摩托车', alias: 'motorcycle 250-500cc motuoche', group: '87.11 摩托车' },
  { code: '8711400000', name: '500-800cc摩托车', alias: 'motorcycle 500-800cc motuoche', group: '87.11 摩托车' },
  { code: '8711500000', name: '800cc以上摩托车', alias: 'motorcycle >800cc motuoche', group: '87.11 摩托车' },
  { code: '8711600010', name: '电动摩托车', alias: 'electric motorcycle diandong motuoche', group: '87.11 摩托车' },
  // 8716 - 挂车
  { code: '8716100000', name: '厢式挂车', alias: 'cargo trailer xiangshi guache', group: '87.16 挂车及半挂车' },
  { code: '8716310000', name: '油罐挂车', alias: 'tanker trailer youguan guache', group: '87.16 挂车及半挂车' },
  { code: '8716390000', name: '其他货运挂车', alias: 'other cargo trailer qita huoyun guache', group: '87.16 挂车及半挂车' },
  { code: '8716400000', name: '其他挂车及半挂车', alias: 'other trailer qita guache', group: '87.16 挂车及半挂车' },
  // 8425/8426 - 工程机械（部分二手车商也出口）
  { code: '8425490000', name: '其他起重机', alias: 'other crane qita qizhongji', group: '84.25 起重机械' },
  { code: '8429510000', name: '前铲装载机', alias: 'wheel loader qianchan zhuangzaiji', group: '84.29 工程机械' },
  { code: '8429520000', name: '挖掘机', alias: 'excavator wajueji', group: '84.29 工程机械' },
  { code: '8429590000', name: '其他挖掘/铲运机械', alias: 'other excavator qita wajueji', group: '84.29 工程机械' },
];
