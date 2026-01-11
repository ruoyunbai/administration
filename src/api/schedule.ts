import request from '../utils/request';

const apiOriginFromBaseUrl = () => {
  const raw = String(BASE_URL ?? '').replace(/"/g, '');
  const match = raw.match(/^(https?:\/\/[^/]+)/i);
  if (match) return match[1];
  return raw.replace(/\/api\/v\d+.*$/i, '').replace(/\/+$/, '');
};

export function getAllCoursesV1() {
  return request({
    baseUrl: apiOriginFromBaseUrl(),
    url: '/api/v1/get_all_course',
    method: 'GET',
    data: {},
  });
}

export function getCourseDetailV1(params: { course_id: number | string; online_course_id: number | string }) {
  return request({
    baseUrl: apiOriginFromBaseUrl(),
    url: '/api/v1/get_course_detail',
    method: 'GET',
    data: params,
  });
}

export function updateOnlineCourseScheduleV1(params: {
  online_course_id: number | string;
  weekday: number;
  timeSection: number;
  beginTime?: string;
  place?: string;
  startDate?: string;
  endDate?: string;
}) {
  return request({
    baseUrl: apiOriginFromBaseUrl(),
    url: '/api/v1/update_online_course_schedule',
    method: 'POST',
    data: params,
  });
}
