<template>
  <view class="finance">
    <!-- Term Selector -->
    <picker mode="selector" :range="termList" range-key="name" @change="onTermChange">
      <nut-cell title="选择学期" :desc="selectedTerm?.name || '请选择'" is-link></nut-cell>
    </picker>

    <!-- Term Navigation -->
    <view class="term-selector">
      <nut-button size="small" icon="left" :disabled="isNextButtonDisabled" @click="navigateTerm(1)">上个学期</nut-button>
      <view class="term-name">{{ financeStats?.term_name || selectedTerm?.name || '加载中...' }}</view>
      <nut-button size="small" icon="right" :disabled="isPrevButtonDisabled" @click="navigateTerm(-1)">下个学期</nut-button>
    </view>

    <nut-cell-group title="订单">
      <nut-cell title="订单查询" desc="查询已支付 / 未支付 / 全部" is-link @click="goToOrderQuery"></nut-cell>
    </nut-cell-group>

    <nut-popup v-model:visible="studentDetailVisible" position="bottom" round closeable :close-on-click-overlay="true"
      :destroy-on-close="true" :safe-area-inset-bottom="true" :style="{ height: '70vh' }">
      <scroll-view scroll-y class="detail-popup-scroll">
        <view v-if="studentDetail?.info">
          <nut-cell-group title="学生信息">
            <nut-cell title="姓名" :desc="studentDetail.info.real_name || '-'"></nut-cell>
            <nut-cell title="电话" :desc="studentDetail.info.phone || '-'"></nut-cell>
            <nut-cell title="邮箱" :desc="studentDetail.info.email || '-'"></nut-cell>
            <nut-cell title="学号" :desc="studentDetail.info.number || '-'"></nut-cell>
            <nut-cell title="学校" :desc="studentDetail.info.college_name || '-'"></nut-cell>
            <nut-cell title="班级" :desc="studentDetail.info.class || '-'"></nut-cell>
            <nut-cell title="专业" :desc="studentDetail.info.major || '-'"></nut-cell>
            <nut-cell title="学院" :desc="studentDetail.info.academy || '-'"></nut-cell>
            <nut-cell v-if="Number(studentDetail.info.has_minor) === 1" title="辅修专业"
              :desc="studentDetail.info.minor || '-'"></nut-cell>
            <nut-cell v-if="Number(studentDetail.info.has_minor) === 1" title="辅修证书号"
              :desc="studentDetail.info.certificate_no || '-'"></nut-cell>
          </nut-cell-group>
        </view>
        <view v-else class="empty-state">暂无详情</view>
      </scroll-view>
    </nut-popup>

    <view v-if="financeStats?.stats">
      <nut-cell-group :title="`财务概览 - ${financeStats?.term_name || ''}`">
        <nut-cell title="总订单"
          :desc="`${financeStats.stats.overview?.total_orders ?? (Number(financeStats.stats.paid?.order_count ?? 0) + Number(financeStats.stats.unpaid?.order_count ?? 0))} 单 / ¥ ${financeStats.stats.overview?.total_amount ?? '0.00'}`"></nut-cell>
        <nut-cell title="交易人数"
          :desc="`${financeStats.stats.overview?.order_users ?? financeStats.stats.overview?.user_count ?? financeStats.stats.overview?.student_count ?? financeStats.stats.overview?.users ?? 0} 人`"></nut-cell>
        <nut-cell title="支付率" :desc="`${financeStats.stats.overview?.payment_rate ?? '0.00'}%`"></nut-cell>
        <nut-cell title="已支付客单价" :desc="`¥ ${financeStats.stats.overview?.avg_paid_order_amount ?? '0.00'}`"></nut-cell>
        <nut-cell title="未支付客单价"
          :desc="`¥ ${financeStats.stats.overview?.avg_unpaid_order_amount ?? '0.00'}`"></nut-cell>
      </nut-cell-group>

      <nut-cell-group :title="`订单状态统计 - ${financeStats?.term_name || ''}`">
        <nut-cell title="已支付订单"
          :desc="`${financeStats.stats.paid?.order_count ?? 0} 单 / ¥ ${financeStats.stats.paid?.amount ?? '0.00'}`"></nut-cell>
        <nut-cell title="未支付订单"
          :desc="`${financeStats.stats.unpaid?.order_count ?? 0} 单 / ¥ ${financeStats.stats.unpaid?.amount ?? '0.00'}`"></nut-cell>
      </nut-cell-group>

      <nut-cell-group title="未支付 Top10（课程）">
        <nut-cell v-for="row in (financeStats.stats.top_unpaid_by_course || [])"
          :key="String(row.course_id ?? row.course_name)" :title="row.course_name"
          :desc="`${row.course_college_name || ''} · ${row.order_count ?? 0} 单 / ¥ ${row.amount ?? '0.00'}`"></nut-cell>
        <view v-if="(financeStats.stats.top_unpaid_by_course || []).length === 0" class="empty-state">
          暂无数据
        </view>
      </nut-cell-group>

      <nut-cell-group title="未支付 Top10（学生学校）">
        <nut-cell v-for="row in (financeStats.stats.top_unpaid_by_student_college || [])"
          :key="String(row.student_college_id ?? row.student_college_name)" :title="row.student_college_name"
          :desc="`${row.order_count ?? 0} 单 / ¥ ${row.amount ?? '0.00'}`"></nut-cell>
        <view v-if="(financeStats.stats.top_unpaid_by_student_college || []).length === 0" class="empty-state">
          暂无数据
        </view>
      </nut-cell-group>

      <nut-cell-group title="未支付 Top10（开课学校）">
        <nut-cell v-for="row in (financeStats.stats.top_unpaid_by_course_college || [])"
          :key="String(row.course_college_id ?? row.course_college_name)" :title="row.course_college_name"
          :desc="`${row.order_count ?? 0} 单 / ¥ ${row.amount ?? '0.00'}`"></nut-cell>
        <view v-if="(financeStats.stats.top_unpaid_by_course_college || []).length === 0" class="empty-state">
          暂无数据
        </view>
      </nut-cell-group>

      <nut-cell-group title="待处理列表">
        <nut-cell title="长时间未支付订单"
          :desc="`超过 ${financeStats.stats.overdue_unpaid?.threshold_hours ?? 24} 小时：${financeStats.stats.overdue_unpaid?.order_count ?? 0} 单 / ¥ ${financeStats.stats.overdue_unpaid?.amount ?? '0.00'}（时间缺失：${financeStats.stats.overdue_unpaid?.missing_time?.order_count ?? 0} 单）`"></nut-cell>

        <nut-cell v-for="row in (financeStats.stats.overdue_unpaid?.orders || [])"
          :key="String(row.order_id ?? `${row.user_id}_${row.course_name}_${row.create_time}`)"
          :title="row.course_name || '订单'"
          :desc="`${row.user_name || row.user_id || ''} ¥ ${Number(row.fee ?? 0).toFixed(2)} ${row.create_time_text || row.create_time || ''}`"
          is-link @click="loadStudentDetail(row.user_id)"></nut-cell>

        <nut-button v-if="financeStats.stats.overdue_unpaid?.has_more" type="primary" plain block
          @click="loadMoreOverdue">加载更多</nut-button>

        <view v-if="(financeStats.stats.overdue_unpaid?.orders || []).length === 0" class="empty-state">
          暂无长时间未支付订单
        </view>
      </nut-cell-group>
    </view>

    <view v-else-if="!loading" class="empty-state">
      暂无数据
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref, computed, reactive } from 'vue';
import Taro from '@tarojs/taro';
import { getStats, getTerms } from '../../api/stats';
import { getStudentDetail } from '../../api/student';


const termList = ref([]);
const selectedTerm = ref(null);
const financeStats = ref(null);
const loading = ref(true);
const overduePage = ref(1);
const overduePageSize = 20;
const studentDetail = ref(null);
const studentDetailVisible = ref(false);

const isPrevButtonDisabled = computed(() => {
  if (!selectedTerm.value) return true;
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  return currentIndex <= 0;
});

const isNextButtonDisabled = computed(() => {
  if (!selectedTerm.value) return true;
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  return currentIndex >= termList.value.length - 1;
});

const goToOrderQuery = () => {
  Taro.navigateTo({ url: '/pages/financeOrders/index' });
};

const loadStudentDetail = async (userId) => {
  if (!userId) {
    Taro.showToast({ title: '缺少学生信息', icon: 'none' });
    return;
  }
  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getStudentDetail({ user_id: userId });
    if (res && res.state === 'success' && res.data) {
      studentDetail.value = res.data;
      studentDetailVisible.value = true;
    } else {
      Taro.showToast({ title: res?.reason || '查询学生信息失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch student detail:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
  }
};

const fetchFinanceStats = async (termId, page = 1) => {
  if (!termId) return;
  loading.value = true;
  if (page === 1) financeStats.value = null;

  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getStats('finance', {
      semester: termId,
      overdue_page: page,
      overdue_page_size: overduePageSize,
      overdue_hours: 24,
    });
    if (res && res.state === 'success' && res.data) {
      if (page === 1) {
        financeStats.value = res.data;
      } else {
        const existingOrders = financeStats.value?.stats?.overdue_unpaid?.orders || [];
        const nextOrders = res.data?.stats?.overdue_unpaid?.orders || [];
        financeStats.value = {
          ...res.data,
          stats: {
            ...res.data.stats,
            overdue_unpaid: {
              ...res.data.stats.overdue_unpaid,
              orders: [...existingOrders, ...nextOrders],
            },
          },
        };
      }
      overduePage.value = page;
    } else {
      Taro.showToast({ title: res?.reason || '数据加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch finance stats:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
    loading.value = false;
  }
};

const refreshTermData = async (termId) => {
  if (!termId) return;
  overduePage.value = 1;
  await fetchFinanceStats(termId, 1);
};

const loadTerms = async () => {
  try {
    const res = await getTerms();
    if (res && res.state === 'success' && res.data.length > 0) {
      termList.value = res.data;
      selectedTerm.value = res.data[0];
      await refreshTermData(selectedTerm.value.id);
    } else {
      Taro.showToast({ title: res?.reason || '学期列表加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to load terms:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  }
};

const onTermChange = async (e) => {
  const newIndex = e.detail.value;
  selectedTerm.value = termList.value[newIndex];
  await refreshTermData(selectedTerm.value.id);
};

const navigateTerm = async (direction) => {
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  const newIndex = currentIndex + direction;

  if (newIndex >= 0 && newIndex < termList.value.length) {
    selectedTerm.value = termList.value[newIndex];
    await refreshTermData(selectedTerm.value.id);
  }
};



const loadMoreOverdue = () => {
  if (!selectedTerm.value?.id) return;
  if (!financeStats.value?.stats?.overdue_unpaid?.has_more) return;
  fetchFinanceStats(selectedTerm.value.id, overduePage.value + 1);
};

onMounted(loadTerms);
</script>

<style lang="scss">
.finance {
  padding: 16px;
}

.select-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.selected-value {
  margin-top: 6px;
  font-size: 14px;
  color: #666;
}

.filter-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}

.filter-hint {
  margin-top: 8px;
  font-size: 12px;
  color: #888;
}

.detail-popup-scroll {
  height: 100%;
  padding: 12px;
  box-sizing: border-box;
}

.term-selector {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  background-color: #f7f7f7;
  border-radius: 8px;
  margin-top: 10px;
  margin-bottom: 20px;
}

.term-name {
  font-size: 16px;
  font-weight: bold;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 16px;
}

.order-desc {
  display: flex;
  flex-direction: column;
  gap: 2px;
  color: #666;
}

.order-line {
  font-size: 14px;
}

.loading-text {
  text-align: center;
  color: #888;
  padding: 10px 0;
}
</style>
