import request from '../utils/request';

export function searchStudents(params: { q: string; limit?: number }) {
  return request({
    url: '/student/search',
    method: 'GET',
    data: params,
  });
}

export function getStudentDetail(params: { user_id: number | string }) {
  return request({
    url: '/student/detail',
    method: 'GET',
    data: params,
  });
}

