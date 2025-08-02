<template>
  <view class="finance">
    <nut-cell-group title="订单状态统计">
      <nut-cell title="已支付订单" desc="1520 单 / ¥ 123,456.78"></nut-cell>
      <nut-cell title="未支付订单" desc="85 单 / ¥ 7,890.00"></nut-cell>
    </nut-cell-group>
    <nut-cell-group title="待处理列表">
       <nut-cell title="长时间未支付订单" desc="共 15 单，点击查看详情"></nut-cell>
    </nut-cell-group>
  </view>
</template>

<script setup>
</script>

<style lang="scss">
.finance {
  padding: 16px;
}
</style>
