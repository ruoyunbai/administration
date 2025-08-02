<template>
  <view class="course-dashboard">
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
      <view class="term-name">{{ selectedTerm?.name || '加载中...' }}</view>
      <nut-button
        size="small"
        icon="right"
     :disabled="isPrevButtonDisabled"
        @click="navigateTerm(-1)"
      >下个学期</nut-button>
    </view>
    
    <!-- Course Stats -->
    <view v-if="courseStats">
      <!-- Key Course Lists -->
      <nut-collapse v-model="activeCollapse" icon="down-arrow">
        <nut-collapse-item :title="`濒临取消课程 (${courseStats.near_cancellation.length})`" name="1">
          <view v-if="courseStats.near_cancellation.length > 0">
            <div v-for="course in courseStats.near_cancellation" :key="course.course_name" class="course-card">
              <p><strong>{{ course.course_name }}</strong> ({{ course.teacher_name }})</p>
              <p>选课情况: {{ course.enrolled }} / {{ course.capacity }} (饱和度: {{ course.saturation }}%)</p>
              <p>开课下限: {{ course.min_enrollment || 'N/A' }}</p>
            </div>
          </view>
          <view v-else class="empty-state">无</view>
        </nut-collapse-item>
        <nut-collapse-item :title="`高热度课程 (${courseStats.high_demand.length})`" name="2">
           <view v-if="courseStats.high_demand.length > 0">
            <div v-for="course in courseStats.high_demand" :key="course.course_name" class="course-card">
              <p><strong>{{ course.course_name }}</strong> ({{ course.teacher_name }})</p>
              <p>选课情况: {{ course.enrolled }} / {{ course.capacity }} (饱和度: {{ course.saturation }}%)</p>
            </div>
          </view>
           <view v-else class="empty-state">无</view>
        </nut-collapse-item>
        <nut-collapse-item :title="`低迷课程 (${courseStats.low_interest.length})`" name="3">
           <view v-if="courseStats.low_interest.length > 0">
            <div v-for="course in courseStats.low_interest" :key="course.course_name" class="course-card">
              <p><strong>{{ course.course_name }}</strong> ({{ course.teacher_name }})</p>
              <p>选课情况: {{ course.enrolled }} / {{ course.capacity }} (饱和度: {{ course.saturation }}%)</p>
            </div>
          </view>
           <view v-else class="empty-state">无</view>
        </nut-collapse-item>
      </nut-collapse>

      <!-- All Courses Table -->
      <nut-cell-group :title="`全部课程列表 (${courseStats.all_courses.length})`">
         <div class="table-container">
            <div class="table-header">
              <div class="table-cell">课程名称</div>
              <div class="table-cell">教师</div>
              <div class="table-cell small">已选/容量</div>
              <div class="table-cell small">饱和度</div>
            </div>
            <div class="table-body">
              <div v-for="course in courseStats.all_courses" :key="course.course_name" class="table-row">
                <div class="table-cell">{{ course.course_name }}</div>
                <div class="table-cell">{{ course.teacher_name }}</div>
                <div class="table-cell small">{{ course.enrolled }} / {{ course.capacity }}</div>
                <div class="table-cell small">{{ course.saturation }}%</div>
              </div>
            </div>
        </div>
      </nut-cell-group>
    </view>
    <view v-else-if="!loading" class="empty-state">
      当前学期无课程数据
    </view>

  </view>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { getStats, getTerms } from '../../api/stats';
import Taro from '@tarojs/taro';

// --- State ---
const termList = ref([]);
const selectedTerm = ref(null);
const courseStats = ref(null);
const activeCollapse = ref(['1', '2']); // Default open collapses
const loading = ref(true);

// --- Computed ---
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

// --- Methods ---
const fetchCourseStats = async (termId) => {
  if (!termId) return;
  
  loading.value = true;
  courseStats.value = null;
  Taro.showLoading({ title: '加载中...' });

  try {
    const params = { semester: termId };
    const res = await getStats('courses', params);
    
    if (res && res.state === 'success' && res.data) {
      courseStats.value = res.data.stats;
    } else {
      Taro.showToast({ title: res.reason || '数据加载失败', icon: 'none' });
    }
  } catch (error) {
    console.error('Failed to fetch course stats:', error);
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
      selectedTerm.value = res.data[0]; // Default to the latest term
      await fetchCourseStats(selectedTerm.value.id);
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
  fetchCourseStats(selectedTerm.value.id);
};

const navigateTerm = (direction) => {
  const currentIndex = termList.value.findIndex(t => t.id === selectedTerm.value.id);
  const newIndex = currentIndex + direction;

  if (newIndex >= 0 && newIndex < termList.value.length) {
    selectedTerm.value = termList.value[newIndex];
    fetchCourseStats(selectedTerm.value.id);
  }
};

onMounted(loadTerms);

</script>

<style lang="scss">
.course-dashboard {
  padding: 0;
}

.term-selector {
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 10px 0;
  background-color: #f5f5f5;
}

.term-name {
  font-size: 16px;
  font-weight: bold;
  color: #333;
}

.course-card {
  background-color: #fff;
  padding: 10px;
  margin-bottom: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-container {
  background-color: #fff;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-header, .table-row {
  display: flex;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #eee;
}

.table-header {
  background-color: #f0f0f0;
  font-weight: bold;
  color: #333;
}

.table-cell {
  flex: 1;
  text-align: left;
  padding: 0 5px;
}

.table-cell.small {
  text-align: center;
  width: 100px; /* Fixed width for small cells */
}

.table-body {
  max-height: 400px; /* Adjust as needed */
  overflow-y: auto;
}

.table-row:last-child {
  border-bottom: none;
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 16px;
}
</style>
