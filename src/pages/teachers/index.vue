<template>
  <view class="teachers">
    <nut-cell-group title="教师教学负载分析">
      <nut-cell title="各学校开课教师" desc="北航: 25人, 清华: 15人..."></nut-cell>
      <nut-cell title="教师人均授课人次" desc="45.5 人/师"></nut-cell>
    </nut-cell-group>
    <nut-cell-group title="热门教师分析">
      <nut-cell title="授课总人次 Top 3" desc="王老师, 李老师, 张老师"></nut-cell>
      <nut-cell title="课程平均饱和度 Top 3" desc="李老师, 赵老师, 陈老师"></nut-cell>
    </nut-cell-group>
  </view>
</template>

<script setup>
</script>

<style lang="scss">
.teachers {
  padding: 16px;
}
</style>
