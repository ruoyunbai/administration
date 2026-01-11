<template>
  <view class="students">
    <nut-cell-group title="学生查询">
      <view class="student-search-bar">
        <input
          v-model="studentQuery"
          class="student-search-input"
          type="text"
          placeholder="输入学生姓名或电话"
        />
        <nut-button
          size="small"
          type="primary"
          :disabled="studentSearching"
          @click="onStudentSearch"
        >
          {{ studentSearching ? '查询中' : '查询' }}
        </nut-button>
      </view>
    </nut-cell-group>

    <nut-cell-group
      v-if="studentSearchResults.length > 0"
      :title="`查询结果 (${studentSearchResults.length})`"
    >
      <nut-cell
        v-for="row in studentSearchResults"
        :key="String(row.user_id)"
        :title="`${row.real_name || '未知'}（${row.number || '无学号'}）`"
        :desc="`${row.phone || ''}${row.college_name ? ' · ' + row.college_name : ''}`"
        is-link
        @click="loadStudentDetail(row.user_id)"
      ></nut-cell>
    </nut-cell-group>

    <view v-else-if="studentSearched && !studentSearching" class="empty-state">
      未找到匹配学生
    </view>

    <nut-popup
      v-model:visible="studentDetailVisible"
      position="bottom"
      round
      closeable
      :close-on-click-overlay="true"
      :destroy-on-close="true"
      :safe-area-inset-bottom="true"
      :style="{ height: '85vh' }"
    >
      <scroll-view scroll-y class="detail-popup-scroll">
        <view v-if="studentDetail?.info">
          <nut-cell-group title="学生详细信息">
            <nut-cell title="姓名" :desc="studentDetail.info.real_name || '-'"></nut-cell>
            <nut-cell title="电话" :desc="studentDetail.info.phone || '-'"></nut-cell>
            <nut-cell title="学号" :desc="studentDetail.info.number || '-'"></nut-cell>
            <nut-cell title="学校" :desc="studentDetail.info.college_name || '-'"></nut-cell>
            <nut-cell title="班级" :desc="studentDetail.info.class || '-'"></nut-cell>
            <nut-cell title="专业" :desc="studentDetail.info.major || '-'"></nut-cell>
            <nut-cell title="学院" :desc="studentDetail.info.academy || '-'"></nut-cell>
            <nut-cell title="邮箱" :desc="studentDetail.info.email || '-'"></nut-cell>
            <nut-cell title="身份证" :desc="studentDetail.info.id_no || '-'"></nut-cell>
            <nut-cell
              v-if="Number(studentDetail.info.has_minor) === 1"
              title="辅修专业"
              :desc="studentDetail.info.minor || '-'"
            ></nut-cell>
            <nut-cell
              v-if="Number(studentDetail.info.has_minor) === 1"
              title="辅修证书号"
              :desc="studentDetail.info.certificate_no || '-'"
            ></nut-cell>
          </nut-cell-group>

          <nut-cell-group v-if="studentDetail.common_result" title="公共课成绩">
            <view v-for="(list, termName) in studentDetail.common_result" :key="`cr_${termName}`">
              <nut-cell :title="String(termName)" :desc="`共 ${(list || []).length} 门`"></nut-cell>
              <nut-cell
                v-for="course in list"
                :key="`cr_${termName}_${course.course_name}`"
                :title="course.course_name"
                :desc="String(course.point)"
              ></nut-cell>
            </view>
          </nut-cell-group>

          <nut-cell-group v-if="studentDetail.minor_result" title="辅修课成绩">
            <view v-for="(list, termName) in studentDetail.minor_result" :key="`mr_${termName}`">
              <nut-cell :title="String(termName)" :desc="`共 ${(list || []).length} 门`"></nut-cell>
              <nut-cell
                v-for="course in list"
                :key="`mr_${termName}_${course.minor_course_name}`"
                :title="course.minor_course_name"
                :desc="String(course.point)"
              ></nut-cell>
            </view>
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
      <view class="term-name">{{ studentStats?.term_name || selectedTerm?.name || '加载中...' }}</view>
      <nut-button
        size="small"
        icon="right"
        :disabled="isPrevButtonDisabled"
        @click="navigateTerm(-1)"
      >下个学期</nut-button>
    </view>

    <view v-if="studentStats?.stats">
      <nut-cell-group :title="`学生来源分布 - ${studentStats?.term_name || ''}`">
        <nut-cell
          v-for="row in (studentStats.stats.source_distribution || []).slice(0, 8)"
          :key="String(row.college_id ?? row.college_name)"
          :title="row.college_name"
          :desc="`${row.student_count} 人 (${row.percent}%)`"
        ></nut-cell>
        <view v-if="(studentStats.stats.source_distribution || []).length === 0" class="empty-state">
          暂无学生来源数据
        </view>
      </nut-cell-group>

      <nut-cell-group title="学生参与度分析">
        <nut-cell
          title="整体参选率"
          :desc="`${studentStats.stats.participation_rate}% (${studentStats.stats.participating_students} / ${studentStats.stats.total_students})`"
        ></nut-cell>
        <nut-cell
          title="零选课学生"
          :desc="`共 ${studentStats.stats.zero_selection_students?.count ?? 0} 人`"
        ></nut-cell>
        <nut-cell
          v-for="row in (studentStats.stats.participation_by_college || []).slice(0, 8)"
          :key="`p_${String(row.college_id ?? row.college_name)}`"
          :title="row.college_name"
          :desc="`参与 ${row.participating_students} / ${row.total_students} (${row.participation_rate}%)`"
        ></nut-cell>
      </nut-cell-group>

      <nut-cell-group title="跨学校选课 Top10">
        <nut-cell
          v-for="(row, idx) in (studentStats.stats.cross_school_top_by_student_college || []).slice(0, 10)"
          :key="`cs_${String(row.student_college_id ?? row.student_college_name)}`"
          :title="`#${idx + 1} ${row.student_college_name}`"
          :desc="`${row.course_college_name}《${row.course_name}》 · ${row.selections} 人次`"
        ></nut-cell>

        <view
          v-if="(studentStats.stats.cross_school_top_by_student_college || []).length === 0"
          class="empty-state"
        >
          暂无跨校选课数据
        </view>
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
import { searchStudents, getStudentDetail } from '../../api/student';
import Taro from '@tarojs/taro';

const termList = ref([]);
const selectedTerm = ref(null);
const studentStats = ref(null);
const loading = ref(true);

const studentQuery = ref('');
const studentSearching = ref(false);
const studentSearched = ref(false);
const studentSearchResults = ref([]);
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

const loadStudentDetail = async (userId) => {
  if (!userId) return;
  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getStudentDetail({ user_id: userId });
    if (res && res.state === 'success' && res.data) {
      studentDetail.value = res.data;
      studentDetailVisible.value = true;
    } else {
      Taro.showToast({ title: res.reason || '查询详情失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch student detail:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    Taro.hideLoading();
  }
};

const onStudentSearch = async () => {
  const q = String(studentQuery.value || '').trim();
  if (!q) {
    Taro.showToast({ title: '请输入学生姓名或电话', icon: 'none' });
    return;
  }

  studentSearching.value = true;
  studentSearched.value = false;
  studentSearchResults.value = [];
  studentDetail.value = null;
  studentDetailVisible.value = false;

  try {
    const res = await searchStudents({ q, limit: 20 });
    studentSearched.value = true;
    if (res && res.state === 'success' && Array.isArray(res.data)) {
      studentSearchResults.value = res.data;
      if (res.data.length === 1 && res.data[0]?.user_id) {
        await loadStudentDetail(res.data[0].user_id);
      }
    } else {
      Taro.showToast({ title: res.reason || '查询失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to search students:', error);
    Taro.showToast({ title: '网络请求异常', icon: 'none' });
  } finally {
    studentSearching.value = false;
  }
};

const fetchStudentStats = async (termId) => {
  if (!termId) return;
  loading.value = true;
  studentStats.value = null;

  Taro.showLoading({ title: '加载中...' });
  try {
    const res = await getStats('students', { semester: termId });
    if (res && res.state === 'success' && res.data) {
      studentStats.value = res.data;
    } else {
      Taro.showToast({ title: res.reason || '数据加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch student stats:', error);
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
      await fetchStudentStats(selectedTerm.value.id);
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
  fetchStudentStats(selectedTerm.value.id);
};

const navigateTerm = (direction) => {
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  const newIndex = currentIndex + direction;

  if (newIndex >= 0 && newIndex < termList.value.length) {
    selectedTerm.value = termList.value[newIndex];
    fetchStudentStats(selectedTerm.value.id);
  }
};

onMounted(loadTerms);
</script>

<style lang="scss">
.students {
  padding: 16px;
}
.nut-cell-group {
  margin-bottom: 20px;
}
.student-search-bar {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 24rpx;
  background-color: #f7f7f7;
  border-radius: 16rpx;
}
.student-search-input {
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
