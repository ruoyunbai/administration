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
      <!-- All Courses Table -->
      <view class="course-list-toolbar">
        <view class="course-list-title">
          全部课程列表 ({{ filteredCourses.length }}/{{ courseStats.all_courses.length }})
        </view>
        <picker
          mode="selector"
          :range="courseFilterOptions"
          range-key="label"
          @change="onCourseFilterChange"
        >
          <view>
            <nut-button size="small" type="primary" plain>
              筛选：{{ courseFilterLabel }}
            </nut-button>
          </view>
        </picker>
      </view>
      <nut-cell-group>
        <div class="course-list-container">
          <view v-if="filteredCourses.length === 0" class="empty-state">无符合条件的课程</view>
          <div v-for="course in filteredCourses" :key="courseKey(course)" class="course-item">
            <!-- 课程基本信息 -->
            <div class="course-header">
              <div class="course-name">{{ course.course_name }}</div>
              <div class="course-status" :class="getStatusClass(course)">
                {{ getStatusText(course) }}
              </div>
            </div>
            
            <!-- 教师信息 -->
            <div class="course-teacher">
              <text class="teacher-label">教师:</text>
              <text class="teacher-name">{{ course.teacher_name }}</text>
            </div>
            
            <!-- 选课进度 -->
            <div class="course-progress">
              <div class="progress-info">
                <text class="progress-text">{{ course.enrolled }} / {{ course.capacity }}</text>
                <text class="progress-percent">{{ course.saturation }}%</text>
              </div>
              <div class="progress-bar">
                <div
                  class="progress-fill"
                  :class="getProgressClass(course)"
                  :style="{ width: Math.min(Number(course.saturation) || 0, 100) + '%' }"
                ></div>
              </div>
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
const loading = ref(true);
const courseFilter = ref('all');

const courseFilterOptions = [
  { value: 'all', label: '全部' },
  { value: 'near_cancellation', label: '未开课（人数<下限）' },
  { value: 'high_demand', label: '高热度（>70%）' },
  { value: 'low_interest', label: '冷门（<10%）' },
];

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

const normalizeText = (value) => String(value ?? '').trim().replace(/\s+/g, ' ');

const courseId = (course) =>
  course?.course_id ??
  course?.courseId ??
  course?.id ??
  course?.course_code ??
  course?.courseCode ??
  null;

const courseKey = (course) => {
  const id = courseId(course);
  if (id !== null && id !== undefined && id !== '') return String(id);
  return `${normalizeText(course?.course_name)}||${normalizeText(course?.teacher_name)}`;
};

const courseFilterLabel = computed(() => {
  const hit = courseFilterOptions.find(o => o.value === courseFilter.value);
  return hit?.label ?? '全部';
});

const courseKeySetFromStatsList = (list) => {
  if (!Array.isArray(list)) return new Set();
  return new Set(list.map(courseKey));
};

const toNumber = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') {
    const m = value.match(/-?\d+(\.\d+)?/);
    if (m) {
      const n = Number(m[0]);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const isNearCancellation = (course, stats) => {
  const enrolled = toNumber(course?.enrolled);
  const minEnrollment =
    toNumber(course?.min_enrollment) ??
    toNumber(course?.minEnrollment) ??
    toNumber(course?.min_enroll) ??
    toNumber(course?.minEnroll);
  if (enrolled !== null && minEnrollment !== null) return enrolled < minEnrollment;

  const list = stats?.near_cancellation;
  if (!Array.isArray(list) || list.length === 0) return false;

  const id = courseId(course);
  if (id !== null && id !== undefined && id !== '') {
    const idSet = new Set(list.map(courseId).filter(v => v !== null && v !== undefined && v !== '').map(String));
    if (idSet.has(String(id))) return true;
  }

  const fullKeySet = courseKeySetFromStatsList(list);
  if (fullKeySet.has(courseKey(course))) return true;

  const nameSet = new Set(list.map(c => normalizeText(c?.course_name)).filter(Boolean));
  return nameSet.has(normalizeText(course?.course_name));
};

const isHighDemand = (course) => {
  const saturation = toNumber(course?.saturation);
  if (saturation === null) return false;
  return saturation >= 70;
};

const isLowInterest = (course) => {
  const saturation = toNumber(course?.saturation);
  if (saturation === null) return false;
  return saturation < 10;
};

const filteredCourses = computed(() => {
  const stats = courseStats.value;
  const all = stats?.all_courses ?? [];
  if (courseFilter.value === 'all') return all;

  if (courseFilter.value === 'near_cancellation') {
    return all.filter(c => isNearCancellation(c, stats));
  }
  if (courseFilter.value === 'high_demand') {
    return all.filter(c => !isNearCancellation(c, stats) && isHighDemand(c));
  }
  if (courseFilter.value === 'low_interest') {
    return all.filter(c => !isNearCancellation(c, stats) && isLowInterest(c));
  }
  return all;
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
      courseFilter.value = 'all';
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

const onCourseFilterChange = (e) => {
  const newIndex = Number(e.detail.value);
  const option = courseFilterOptions[newIndex];
  if (option?.value) courseFilter.value = option.value;
};

const getCourseCategory = (course) => {
  const stats = courseStats.value;
  if (isNearCancellation(course, stats)) return 'near_cancellation';

  const saturation = toNumber(course?.saturation) ?? 0;
  if (saturation >= 100) return 'full';
  if (saturation >= 70) return 'high_demand';
  if (saturation < 10) return 'low_interest';
  return 'normal';
};

// 获取状态样式类
const getStatusClass = (course) => {
  const category = getCourseCategory(course);
  if (category === 'near_cancellation') return 'status-near';
  if (category === 'full') return 'status-full';
  if (category === 'high_demand') return 'status-high';
  if (category === 'low_interest') return 'status-low';
  return 'status-normal';
};

// 获取状态文本
const getStatusText = (course) => {
  const category = getCourseCategory(course);
  if (category === 'near_cancellation') return '未开课';
  if (category === 'full') return '已满';
  if (category === 'high_demand') return '热门';
  if (category === 'low_interest') return '冷门';
  return '正常';
};

// 获取进度条样式类
const getProgressClass = (course) => {
  const category = getCourseCategory(course);
  if (category === 'near_cancellation') return 'progress-critical';
  if (category === 'full') return 'progress-full';
  if (category === 'high_demand') return 'progress-high';
  if (category === 'low_interest') return 'progress-low';
  return 'progress-normal';
};

onMounted(loadTerms);

</script>

<style lang="scss">
.course-dashboard {
  padding: 0;
}

.course-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
}

.course-list-title {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
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

// 课程列表容器
.course-list-container {
  background-color: #f8f9fa;
  padding: 16px;
  border-radius: 12px;
}

// 单个课程项
.course-item {
  background-color: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  border: 1px solid #f0f0f0;
  transition: all 0.2s ease;
  
  &:last-child {
    margin-bottom: 0;
  }
  
  &:active {
    transform: scale(0.98);
    box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  }
}

// 课程头部（名称和状态）
.course-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.course-name {
  font-size: 30px;
  font-weight: 600;
  color: #1a1a1a;
  line-height: 1.4;
  flex: 1;
  margin-right: 12px;
}

// 状态徽章
.course-status {
  padding: 6px 10px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 500;
  white-space: nowrap;

  &.status-near {
    background-color: #fef2f2;
    color: #dc2626;
  }
  
  &.status-full {
    background-color: #fee2e2;
    color: #dc2626;
  }
  
  &.status-high {
    background-color: #fef3c7;
    color: #d97706;
  }
  
  &.status-normal {
    background-color: #d1fae5;
    color: #059669;
  }
  
  &.status-low {
    background-color: #dbeafe;
    color: #2563eb;
  }
  
  &.status-critical {
    background-color: #f3f4f6;
    color: #6b7280;
  }
}

// 教师信息
.course-teacher {
  margin-bottom: 12px;
  
  .teacher-label {
    font-size: 16px;
    color: #6b7280;
    margin-right: 6px;
  }
  
  .teacher-name {
    font-size: 26px;
    color: #374151;
    font-weight: 500;
  }
}

// 选课进度
.course-progress {
  .progress-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
    
    .progress-text {
      font-size: 26px;
      color: #6b7280;
    }
    
    .progress-percent {
      font-size: 26px;
      font-weight: 600;
      color: #1f2937;
    }
  }
}

// 进度条
.progress-bar {
  height: 6px;
  background-color: #f3f4f6;
  border-radius: 3px;
  overflow: hidden;
  
  .progress-fill {
    height: 100%;
    border-radius: 3px;
    transition: width 0.3s ease;
    
    &.progress-full {
      background: linear-gradient(90deg, #dc2626 0%, #ef4444 100%);
    }
    
    &.progress-high {
      background: linear-gradient(90deg, #d97706 0%, #f59e0b 100%);
    }
    
    &.progress-normal {
      background: linear-gradient(90deg, #059669 0%, #10b981 100%);
    }
    
    &.progress-low {
      background: linear-gradient(90deg, #2563eb 0%, #3b82f6 100%);
    }
    
    &.progress-critical {
      background: linear-gradient(90deg, #6b7280 0%, #9ca3af 100%);
    }
  }
}

.empty-state {
  text-align: center;
  padding: 20px;
  color: #999;
  font-size: 16px;
}
</style>
