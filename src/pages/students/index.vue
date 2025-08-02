<template>
  <view class="students">
    <nut-cell-group title="学生来源分布">
      <nut-cell title="北京航空航天大学" desc="800 人 (40%)"></nut-cell>
      <nut-cell title="清华大学" desc="400 人 (20%)"></nut-cell>
      <nut-cell title="北京大学" desc="300 人 (15%)"></nut-cell>
    </nut-cell-group>
    <nut-cell-group title="学生参与度分析">
      <nut-cell title="各学校选课参与率" desc="北航: 25%, 清华: 18%..."></nut-cell>
      <nut-cell title="零选课学生" desc="共 6480 人，点击查看名单"></nut-cell>
    </nut-cell-group>
    <nut-cell-group title="跨学校选课分析">
      <nut-cell title="北航学生最爱选" desc="清华大学的《物理简史》"></nut-cell>
    </nut-cell-group>
  </view>
</template>

<script setup>
</script>

<style lang="scss">
.students {
  padding: 16px;
}
.nut-cell-group {
  margin-bottom: 20px;
}
</style>
