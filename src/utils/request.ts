import Taro from '@tarojs/taro';

const request = (options) => {
  const { url, method, data } = options;
  
  // 拼接完整的请求地址
  const fullUrl = BASE_URL + url;

  return new Promise((resolve, reject) => {
    Taro.request({
      url: fullUrl,
      method: method || 'GET',
      data,
      header: {
        'Content-Type': 'application/json',
      },
      success: (res) => {
        if (res.statusCode === 200) {
          // 只返回业务数据
          resolve(res.data);
        } else {
          // 统一处理错误
          Taro.showToast({
            title: `服务异常: ${res.statusCode}`,
            icon: 'none',
          });
          reject(res);
        }
      },
      fail: (err) => {
        Taro.showToast({
          title: '网络请求失败',
          icon: 'none',
        });
        reject(err);
      }
    });
  });
};

export default request; 