<template>
  <view class="teachers">
    <nut-cell-group title="教师查询">
      <view class="teacher-search-bar">
        <input
          v-model="teacherQuery"
          class="teacher-search-input"
          type="text"
          placeholder="输入教师姓名或电话"
        />
        <nut-button
          size="small"
          type="primary"
          :disabled="teacherSearching"
          @click="onTeacherSearch"
        >
          {{ teacherSearching ? '查询中' : '查询' }}
        </nut-button>
      </view>
    </nut-cell-group>

    <nut-cell-group
      v-if="teacherSearchResults.length > 0"
      :title="`查询结果 (${teacherSearchResults.length})`"
    >
      <nut-cell
        v-for="row in teacherSearchResults"
        :key="String(row.user_id)"
        :title="`${row.real_name || '未知'}${row.title ? ' · ' + row.title : ''}`"
        :desc="`${row.mobile || row.telephone || row.phone || ''}${row.college_name ? ' · ' + row.college_name : ''}`"
        is-link
        @click="loadTeacherDetail(row.user_id)"
      ></nut-cell>
    </nut-cell-group>

    <view v-else-if="teacherSearched && !teacherSearching" class="empty-state">
      未找到匹配教师
    </view>

    <nut-popup
      v-model:visible="teacherDetailVisible"
      position="bottom"
      round
      closeable
      :close-on-click-overlay="true"
      :destroy-on-close="true"
      :safe-area-inset-bottom="true"
      :style="{ height: '70vh' }"
    >
      <scroll-view scroll-y class="detail-popup-scroll">
        <view v-if="teacherDetail?.info">
          <nut-cell-group title="教师详细信息">
            <nut-cell title="姓名" :desc="teacherDetail.info.real_name || '-'"></nut-cell>
            <nut-cell title="职称" :desc="teacherDetail.info.title || '-'"></nut-cell>
            <nut-cell title="学校" :desc="teacherDetail.info.college_name || '-'"></nut-cell>
            <nut-cell title="电话" :desc="teacherDetail.info.telephone || '-'"></nut-cell>
            <nut-cell title="手机" :desc="teacherDetail.info.mobile || '-'"></nut-cell>
            <nut-cell title="邮箱" :desc="teacherDetail.info.email || '-'"></nut-cell>
            <nut-cell title="简介" :desc="teacherDetail.info.description || '-'"></nut-cell>
          </nut-cell-group>
        </view>
        <view v-else class="empty-state">暂无详情</view>
      </scroll-view>
    </nut-popup>

    <!-- Term Selector -->
    <picker mode="selector" :range="termList" range-key="name" @change="onTermChange">
      <nut-cell
        title="选择学期"
        :desc="selectedTerm?.name || '请选择'"
        is-link
      ></nut-cell>
    </picker>

    <!-- Term Navigation -->
    <view class="term-selector">
      <nut-button
        size="small"
        icon="left"
        :disabled="isNextButtonDisabled"
        @click="navigateTerm(1)"
      >上个学期</nut-button>
      <view class="term-name">{{ teacherStats?.term_name || selectedTerm?.name || '加载中...' }}</view>
      <nut-button
        size="small"
        icon="right"
        :disabled="isPrevButtonDisabled"
        @click="navigateTerm(-1)"
      >下个学期</nut-button>
    </view>

    <view v-if="teacherStats?.stats">
      <nut-cell-group :title="`教师教学负载分析 - ${teacherStats?.term_name || ''}`">
        <nut-cell title="开课教师数" :desc="`${teacherStats.stats.total_teachers} 人`"></nut-cell>
        <nut-cell title="人均开课数" :desc="`${teacherStats.stats.avg_courses_per_teacher} 门/师`"></nut-cell>
        <nut-cell title="人均授课人次" :desc="`${teacherStats.stats.avg_students_per_teacher} 人次/师`"></nut-cell>
      </nut-cell-group>

      <nut-cell-group title="各学校开课教师">
        <nut-cell
          v-for="row in (teacherStats.stats.teachers_by_college || []).slice(0, 8)"
          :key="row.college_name"
          :title="row.college_name"
          :desc="`${row.teacher_count} 人`"
        ></nut-cell>
        <view v-if="(teacherStats.stats.teachers_by_college || []).length === 0" class="empty-state">
          暂无数据
        </view>
      </nut-cell-group>

      <nut-cell-group title="教师排名 Top10">
        <nut-cell title="按授课人次排名" desc=""></nut-cell>
        <nut-cell
          v-for="(row, idx) in (teacherStats.stats.top_teachers_by_students || []).slice(0, 10)"
          :key="`s_${String(row.teacher_id ?? row.teacher_name)}`"
          :title="`#${idx + 1} ${row.teacher_name}`"
          :desc="`授课人次：${row.total_students}，开课：${row.course_count}`"
        ></nut-cell>
        <nut-cell title="按平均饱和度排名" desc=""></nut-cell>
        <nut-cell
          v-for="(row, idx) in (teacherStats.stats.top_teachers_by_saturation || []).slice(0, 10)"
          :key="`sat_${String(row.teacher_id ?? row.teacher_name)}`"
          :title="`#${idx + 1} ${row.teacher_name}`"
          :desc="`平均饱和度：${row.avg_saturation ?? 0}%`"
        ></nut-cell>
      </nut-cell-group>
    </view>

    <view v-else-if="!loading" class="empty-state">
      暂无数据
    </view>
  </view>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { getStats, getTerms } from '../../api/stats';
import { searchTeachers, getTeacherDetail } from '../../api/teacher';
import Taro from '@tarojs/taro';

const termList = ref([]);
const selectedTerm = ref(null);
const teacherStats = ref(null);
const loading = ref(true);

const teacherQuery = ref('');
const teacherSearching = ref(false);
const teacherSearched = ref(false);
const teacherSearchResults = ref([]);
const teacherDetail = ref(null);
const teacherDetailVisible = ref(false);

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

const loadTeacherDetail = async (userId) => {
  if (!userId) return;
  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getTeacherDetail({ user_id: userId });
    if (res && res.state === 'success' && res.data) {
      teacherDetail.value = res.data;
      teacherDetailVisible.value = true;
    } else {
      Taro.showToast({ title: res.reason || '查询详情失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch teacher detail:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
  }
};

const onTeacherSearch = async () => {
  const q = String(teacherQuery.value || '').trim();
  if (!q) {
    Taro.showToast({ title: '请输入教师姓名或电话', icon: 'none' });
    return;
  }

  teacherSearching.value = true;
  teacherSearched.value = false;
  teacherSearchResults.value = [];
  teacherDetail.value = null;
  teacherDetailVisible.value = false;

  try {
    const res = await searchTeachers({ q, limit: 20 });
    teacherSearched.value = true;
    if (res && res.state === 'success' && Array.isArray(res.data)) {
      teacherSearchResults.value = res.data;
      if (res.data.length === 1 && res.data[0]?.user_id) {
        await loadTeacherDetail(res.data[0].user_id);
      }
    } else {
      Taro.showToast({ title: res.reason || '查询失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to search teachers:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    teacherSearching.value = false;
  }
};

const fetchTeacherStats = async (termId) => {
  if (!termId) return;
  loading.value = true;
  teacherStats.value = null;

  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getStats('teachers', { semester: termId });
    if (res && res.state === 'success' && res.data) {
      teacherStats.value = res.data;
    } else {
      Taro.showToast({ title: res.reason || '数据加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch teacher stats:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
    loading.value = false;
  }
};

const loadTerms = async () => {
  try {
    const res = await getTerms();
    if (res && res.state === 'success' && res.data.length > 0) {
      termList.value = res.data;
      selectedTerm.value = res.data[0];
      await fetchTeacherStats(selectedTerm.value.id);
    } else {
      Taro.showToast({ title: res.reason || '学期列表加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to load terms:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  }
};

const onTermChange = (e) => {
  const newIndex = e.detail.value;
  selectedTerm.value = termList.value[newIndex];
  fetchTeacherStats(selectedTerm.value.id);
};

const navigateTerm = (direction) => {
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  const newIndex = currentIndex + direction;

  if (newIndex >= 0 && newIndex < termList.value.length) {
    selectedTerm.value = termList.value[newIndex];
    fetchTeacherStats(selectedTerm.value.id);
  }
};

onMounted(loadTerms);
</script>

<style lang="scss">
.teachers {
  padding: 16px;
}
.teacher-search-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background-color: #f7f7f7;
  border-radius: 16rpx;
}
.teacher-search-input {
  flex: 1;
  height: 88rpx;
  background-color: #fff;
  border: 1px solid #ddd;
  border-radius: 20rpx;
  padding: 0 24rpx;
  font-size: 32rpx;
  box-sizing: border-box;
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
</style>
