import request from '../utils/request';

export function searchTeachers(params: { q: string; limit?: number }) {
  return request({
    url: '/teacher/search',
    method: 'GET',
    data: params,
  });
}

export function getTeacherDetail(params: { user_id: number | string }) {
  return request({
    url: '/teacher/detail',
    method: 'GET',
    data: params,
  });
}

