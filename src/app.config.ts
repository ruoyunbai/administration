export default {
  pages: [
    'pages/dashboard/index',
    'pages/courses/index',
    'pages/students/index',
    'pages/teachers/index',
    'pages/finance/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#fff',
    navigationBarTitleText: '学共教务管理',
    navigationBarTextStyle: 'black'
  },
  tabBar: {
    color: '#666',
    selectedColor: '#007aff',
    backgroundColor: '#fff',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/dashboard/index',
        text: '核心指标',
        iconPath: 'static/images/dashboard.png',
        selectedIconPath: 'static/images/dashboard_selected.png'
      },
      {
        pagePath: 'pages/courses/index',
        text: '课程',
        iconPath: 'static/images/courses.png',
        selectedIconPath: 'static/images/courses_selected.png'
      },
      {
        pagePath: 'pages/students/index',
        text: '学生',
        iconPath: 'static/images/students.png',
        selectedIconPath: 'static/images/students_selected.png'
      },
      {
        pagePath: 'pages/teachers/index',
        text: '教师',
        iconPath: 'static/images/teachers.png',
        selectedIconPath: 'static/images/teachers_selected.png'
      },
      {
        pagePath: 'pages/finance/index',
        text: '财务',
        iconPath: 'static/images/finance.png',
        selectedIconPath: 'static/images/finance_selected.png'
      }
    ]
  }
}
