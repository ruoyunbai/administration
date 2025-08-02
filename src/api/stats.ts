import request from '../utils/request';

/**
 * 获取统计看板数据
 * @param board 看板名称
 * @param params 其他参数，如 semester
 */
export function getStats(board: string, params?: { semester?: number | string }) {
  return request({
    url: '/stats',
    method: 'GET',
    data: {
      board,
      ...params,
    },
  });
} 

/**
 * 获取学期列表
 */
export function getTerms() {
  return request({
    url: '/terms',
    method: 'GET',
    data: {},
  });
} 