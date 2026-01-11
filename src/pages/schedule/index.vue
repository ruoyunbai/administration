<template>
  <view class="schedule">
    <nut-cell-group title="排课">
      <nut-cell title="课程总数" :desc="String(courseCount)"></nut-cell>
      <nut-cell
        v-if="isDev"
        title="测试课"
        :desc="devTestEnabled ? '已启用' : '未启用'"
        is-link
        @click="toggleDevTest"
      ></nut-cell>
      <nut-cell title="课程查询" desc="按课程名模糊搜索" is-link @click="openSearch"></nut-cell>
    </nut-cell-group>

    <view v-if="loading" class="empty-state">加载中...</view>
    <view v-else-if="loadError" class="empty-state error">{{ loadError }}</view>

    <scroll-view v-else scroll-x class="grid-scroll">
      <view class="grid">
        <view class="row header">
          <view class="cell corner"></view>
          <view v-for="d in dayLabels" :key="d" class="cell day">{{ d }}</view>
        </view>

        <view v-for="s in sectionLabels" :key="s" class="row">
          <view class="cell section">{{ s }}</view>
          <view
            v-for="d in dayLabels"
            :key="`${d}-${s}`"
            class="cell slot"
            @click="openSlot(d, s)"
          >
            <view class="slot-count" :class="{ empty: slotCount(d, s) === 0 }">
              {{ slotCount(d, s) }}
            </view>
          </view>
        </view>
      </view>
    </scroll-view>

    <nut-popup v-model:visible="slotVisible" position="bottom" :style="{ height: '78vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">{{ selectedDay }} · {{ selectedSection }}</view>
          <view class="popup-actions">
            <nut-button size="small" type="primary" plain @click="loadSlotDetails">批量加载详情</nut-button>
            <nut-button size="small" plain @click="slotVisible = false">关闭</nut-button>
          </view>
        </view>

        <nut-searchbar v-model="slotQuery" placeholder="筛选课程/学校/教师/地点" />

        <view v-if="slotLoading" class="empty-state">正在加载详情...</view>
        <view v-else-if="slotCoursesFiltered.length === 0" class="empty-state">该时段无课程</view>
        <nut-cell-group v-else>
          <nut-cell
            v-for="c in slotCoursesFiltered"
            :key="courseKey(c)"
            :title="c.course_name"
            :desc="slotCourseDesc(c)"
            is-link
            @click="openDetail(c)"
          ></nut-cell>
        </nut-cell-group>
      </view>
    </nut-popup>

    <nut-popup v-model:visible="searchVisible" position="bottom" :style="{ height: '78vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">课程查询</view>
          <view class="popup-actions">
            <nut-button size="small" plain @click="searchVisible = false">关闭</nut-button>
          </view>
        </view>

        <nut-searchbar v-model="searchQuery" placeholder="输入课程名关键字（模糊）" />

        <view v-if="searchQuery.trim().length > 0" class="search-meta">
          找到 {{ searchResults.length }} 门课程
        </view>

        <view v-if="searchQuery.trim().length === 0" class="empty-state">输入课程名开始搜索</view>
        <view v-else-if="searchResults.length === 0" class="empty-state">未找到匹配课程</view>
        <nut-cell-group v-else>
          <nut-cell
            v-for="c in searchResults.slice(0, 50)"
            :key="courseKey(c)"
            :title="c.course_name"
            :desc="`${c.college_name ?? ''}｜${c.time ?? ''}`"
            is-link
            @click="openDetail(c)"
          ></nut-cell>
        </nut-cell-group>
      </view>
    </nut-popup>

    <nut-popup v-model:visible="detailVisible" position="bottom" :style="{ height: '78vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">课程详情</view>
          <view class="popup-actions">
            <nut-button
              v-if="activeDetail && activeCourse && !editEnabled"
              size="small"
              type="primary"
              plain
              @click="setEditEnabled(true)"
            >编辑</nut-button>
            <nut-button
              v-if="editEnabled"
              size="small"
              plain
              @click="setEditEnabled(false)"
            >完成</nut-button>
            <nut-button size="small" plain @click="detailVisible = false">关闭</nut-button>
          </view>
        </view>

        <view v-if="detailLoading" class="empty-state">加载中...</view>
        <view v-else-if="detailError" class="empty-state error">{{ detailError }}</view>
        <nut-cell-group v-else-if="activeDetail">
          <nut-cell title="课程名" :desc="activeDetail.name"></nut-cell>
          <nut-cell title="教师" :desc="`${activeDetail.teacher_name} (${activeDetail.teacher_id})`"></nut-cell>
          <nut-cell title="时间" :desc="activeDetail.time" :is-link="editEnabled" @click="onClickTimeCell"></nut-cell>
          <nut-cell title="地点" :desc="activeDetail.place || '未填写'" :is-link="editEnabled" @click="onClickPlaceCell"></nut-cell>
          <nut-cell title="开课日期" :desc="activeDetail.date || '未填写'" :is-link="editEnabled" @click="onClickDateCell"></nut-cell>
          <nut-cell title="费用" :desc="String(activeDetail.fee ?? '')"></nut-cell>
          <nut-cell title="备注" :desc="activeDetail.ps || '无'"></nut-cell>
        </nut-cell-group>
      </view>
    </nut-popup>

    <nut-popup v-model:visible="timeEditorVisible" position="bottom" :style="{ height: '70vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">编辑时间</view>
          <view class="popup-actions">
            <nut-button size="small" plain :disabled="editSaving" @click="timeEditorVisible = false">取消</nut-button>
            <nut-button size="small" type="primary" :disabled="editSaving" @click="saveTimeEdit">保存</nut-button>
          </view>
        </view>

        <nut-cell-group>
          <picker
            mode="selector"
            :range="weekdayChoices"
            range-key="text"
            :value="editWeekdayIndex"
            @change="onEditWeekdayChange"
          >
            <nut-cell title="星期" :desc="weekdayChoices[editWeekdayIndex]?.text || '-' " is-link></nut-cell>
          </picker>

          <picker
            mode="selector"
            :range="timeSectionChoices"
            range-key="text"
            :value="editTimeSectionIndex"
            @change="onEditTimeSectionChange"
          >
            <nut-cell title="时段" :desc="timeSectionChoices[editTimeSectionIndex]?.text || '-' " is-link></nut-cell>
          </picker>

          <view class="field-row">
            <view class="field-label">具体时间</view>
            <input
              v-model="editBeginTime"
              class="field-input"
              type="text"
              placeholder="例如 19:00-21:25（可留空）"
            />
          </view>
        </nut-cell-group>

        <view class="edit-tip">{{ editTip }}</view>
      </view>
    </nut-popup>

    <nut-popup v-model:visible="placeEditorVisible" position="bottom" :style="{ height: '45vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">编辑地点</view>
          <view class="popup-actions">
            <nut-button size="small" plain :disabled="editSaving" @click="placeEditorVisible = false">取消</nut-button>
            <nut-button size="small" type="primary" :disabled="editSaving" @click="savePlaceEdit">保存</nut-button>
          </view>
        </view>

        <nut-cell-group>
          <view class="field-row">
            <view class="field-label">上课地点</view>
            <input v-model="editPlace" class="field-input" type="text" placeholder="例如 主M201（可留空）" />
          </view>
        </nut-cell-group>

        <view class="edit-tip">{{ editTip }}</view>
      </view>
    </nut-popup>

    <nut-popup v-model:visible="dateEditorVisible" position="bottom" :style="{ height: '60vh' }">
      <view class="popup">
        <view class="popup-header">
          <view class="popup-title">编辑开课日期</view>
          <view class="popup-actions">
            <nut-button size="small" plain :disabled="editSaving" @click="dateEditorVisible = false">取消</nut-button>
            <nut-button size="small" type="primary" :disabled="editSaving" @click="saveDateEdit">保存</nut-button>
          </view>
        </view>

        <nut-cell-group>
          <picker mode="date" :value="editStartDate" @change="onEditStartDateChange">
            <nut-cell title="开始日期" :desc="editStartDate || '未设置'" is-link></nut-cell>
          </picker>
          <picker mode="date" :value="editEndDate" @change="onEditEndDateChange">
            <nut-cell title="结束日期" :desc="editEndDate || '未设置'" is-link></nut-cell>
          </picker>
          <view class="edit-actions">
            <nut-button size="small" plain :disabled="editSaving" @click="clearEditDates">清空日期</nut-button>
          </view>
        </nut-cell-group>

        <view class="edit-tip">{{ editTip }}</view>
      </view>
    </nut-popup>
  </view>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import Taro from '@tarojs/taro';
import { getAllCoursesV1, getCourseDetailV1, updateOnlineCourseScheduleV1 } from '../../api/schedule';

const isDev = process.env.NODE_ENV !== 'production';

const dayLabels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日', '周六周日'];
const sectionLabels = ['上午', '中午', '下午', '晚上', '全天'];

const weekdayChoices = [
  { text: '周一', value: 1 },
  { text: '周二', value: 2 },
  { text: '周三', value: 3 },
  { text: '周四', value: 4 },
  { text: '周五', value: 5 },
  { text: '周六', value: 6 },
  { text: '周日', value: 7 },
  { text: '周六周日', value: 13 },
];

const timeSectionChoices = [
  { text: '上午', value: 1 },
  { text: '中午', value: 4 },
  { text: '下午', value: 2 },
  { text: '晚上', value: 3 },
  { text: '全天', value: 10 },
];

const loading = ref(false);
const loadError = ref('');
const courses = ref([]);

const devTestEnabled = ref(false);
const devTestCourse = ref({
  __isTest: true,
  course_id: 'test',
  online_course_id: 'test',
  course_name: '测试课',
  creditHours: 0,
  capacity: 0,
  students: 0,
  fee: '￥0.0',
  lowerLimit: 0,
  college_name: '教务测试',
  time: '周一上午',
});

const devTestDetail = ref({
  name: '测试课',
  teacher_name: '测试教师',
  teacher_id: 'test-teacher',
  time: '周一上午',
  place: '',
  date: '-',
  fee: 0,
  ps: '仅开发环境可见（本地测试数据）',
});

const slotVisible = ref(false);
const selectedDay = ref('周一');
const selectedSection = ref('上午');
const slotQuery = ref('');
const slotLoading = ref(false);

const searchVisible = ref(false);
const searchQuery = ref('');

const detailVisible = ref(false);
const detailLoading = ref(false);
const detailError = ref('');
const activeDetail = ref(null);
const activeCourse = ref(null);
const editEnabled = ref(false);

const timeEditorVisible = ref(false);
const placeEditorVisible = ref(false);
const dateEditorVisible = ref(false);
const editWeekdayIndex = ref(0);
const editTimeSectionIndex = ref(0);
const editBeginTime = ref('');
const editPlace = ref('');
const editStartDate = ref('');
const editEndDate = ref('');
const editSaving = ref(false);

const detailByKey = ref({});

const courseKey = (course) => `${course?.course_id ?? ''}-${course?.online_course_id ?? ''}`;

const normalizeQuery = (value) => String(value ?? '').trim().toLowerCase();

const allCourses = computed(() => {
  const list = Array.isArray(courses.value) ? courses.value : [];
  if (!isDev || !devTestEnabled.value) return list;
  return [...list, devTestCourse.value];
});

const searchResults = computed(() => {
  const q = normalizeQuery(searchQuery.value);
  if (!q) return [];

  const list = allCourses.value;
  const hits = [];
  for (const c of list) {
    const name = String(c?.course_name ?? '');
    const index = name.toLowerCase().indexOf(q);
    if (index >= 0) hits.push({ c, index, len: name.length });
  }
  hits.sort((a, b) => a.index - b.index || a.len - b.len || String(a.c?.course_name ?? '').localeCompare(String(b.c?.course_name ?? ''), 'zh'));
  return hits.map(h => h.c);
});

const parseSlotFromTime = (timeText) => {
  const text = String(timeText ?? '');
  if (text.includes('周六周日')) return { day: '周六周日', section: sectionLabels.find(s => text.includes(s)) ?? '未知' };
  let day = dayLabels.find(d => text.includes(d));
  if (!day && text.includes('暑假')) day = '假期';
  if (!day && text.includes('寒假')) day = '假期';

  const section = sectionLabels.find(s => text.includes(s)) ?? '未知';
  return { day: day ?? '未知', section };
};

const slotKey = (day, section) => `${day}||${section}`;

const slots = computed(() => {
  const index = Object.create(null);
  for (const c of allCourses.value) {
    const { day, section } = parseSlotFromTime(c?.time);
    const key = slotKey(day, section);
    if (!index[key]) index[key] = [];
    index[key].push(c);
  }
  for (const key of Object.keys(index)) {
    index[key].sort((a, b) => String(a?.course_name ?? '').localeCompare(String(b?.course_name ?? ''), 'zh'));
  }
  return index;
});

const courseCount = computed(() => allCourses.value.length);

const slotCount = (day, section) => (slots.value[slotKey(day, section)] ?? []).length;

const slotCourses = computed(() => slots.value[slotKey(selectedDay.value, selectedSection.value)] ?? []);

const slotCoursesFiltered = computed(() => {
  const q = String(slotQuery.value ?? '').trim().toLowerCase();
  if (!q) return slotCourses.value;

  return slotCourses.value.filter(c => {
    const key = courseKey(c);
    const detail = detailByKey.value[key];
    const hay = [
      c?.course_name,
      c?.college_name,
      c?.time,
      detail?.teacher_name,
      detail?.place,
      detail?.time,
    ]
      .map(v => String(v ?? '').toLowerCase())
      .join('||');
    return hay.includes(q);
  });
});

const ensureDetail = async (course) => {
  const key = courseKey(course);
  if (!key || detailByKey.value[key]) return detailByKey.value[key] ?? null;

  if (course?.__isTest) {
    detailByKey.value = { ...detailByKey.value, [key]: devTestDetail.value };
    return devTestDetail.value;
  }

  const res = await getCourseDetailV1({
    course_id: course.course_id,
    online_course_id: course.online_course_id,
  });
  if (res?.state !== 'success') throw new Error(res?.reason || '加载详情失败');
  detailByKey.value = { ...detailByKey.value, [key]: res.detail };
  return res.detail;
};

const slotTeacherConflictSet = computed(() => {
  const list = slotCourses.value;
  const counts = new Map();
  for (const c of list) {
    const detail = detailByKey.value[courseKey(c)];
    if (!detail?.teacher_id) continue;
    const t = String(detail.teacher_id);
    counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  const conflicts = new Set();
  for (const [teacherId, count] of counts.entries()) {
    if (count > 1) conflicts.add(teacherId);
  }
  return conflicts;
});

const slotCourseDesc = (course) => {
  const base = `${course?.college_name ?? ''}｜${course?.students ?? '-'} / ${course?.capacity ?? '-'}｜${course?.fee ?? ''}`;
  const detail = detailByKey.value[courseKey(course)];
  if (!detail) return base;
  const conflict = slotTeacherConflictSet.value.has(String(detail.teacher_id));
  const conflictText = conflict ? '｜教师冲突' : '';
  return `${detail.teacher_name ?? ''}｜${detail.time ?? ''}｜${detail.place ?? ''}${conflictText}｜${base}`;
};

const loadCourses = async () => {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await getAllCoursesV1();
    if (res?.state !== 'success') throw new Error(res?.reason || '加载失败');
    courses.value = Array.isArray(res.course_list) ? res.course_list : [];
  } catch (e) {
    console.error(e);
    loadError.value = String(e?.message || e || '加载失败');
  } finally {
    loading.value = false;
  }
};

const openSlot = (day, section) => {
  selectedDay.value = day;
  selectedSection.value = section;
  slotQuery.value = '';
  slotVisible.value = true;
};

const loadSlotDetails = async () => {
  if (slotCourses.value.length === 0) return;
  slotLoading.value = true;
  try {
    for (const c of slotCourses.value) {
      try {
        await ensureDetail(c);
      } catch (e) {
        // ignore single item failure
        console.error(e);
      }
    }
  } finally {
    slotLoading.value = false;
  }
};

const openDetail = async (course) => {
  detailVisible.value = true;
  detailLoading.value = true;
  detailError.value = '';
  activeDetail.value = null;
  activeCourse.value = course;
  editEnabled.value = false;
  timeEditorVisible.value = false;
  placeEditorVisible.value = false;
  dateEditorVisible.value = false;
  try {
    const detail = await ensureDetail(course);
    activeDetail.value = detail;
  } catch (e) {
    console.error(e);
    detailError.value = String(e?.message || e || '加载失败');
  } finally {
    detailLoading.value = false;
  }
};

const setEditEnabled = (enabled) => {
  editEnabled.value = Boolean(enabled);
  if (!editEnabled.value) {
    timeEditorVisible.value = false;
    placeEditorVisible.value = false;
    dateEditorVisible.value = false;
  }
};

const onClickTimeCell = () => {
  if (!editEnabled.value) return;
  openTimeEditor();
};

const onClickPlaceCell = () => {
  if (!editEnabled.value) return;
  openPlaceEditor();
};

const onClickDateCell = () => {
  if (!editEnabled.value) return;
  openDateEditor();
};

const openTimeEditor = () => {
  const course = activeCourse.value;
  const detail = activeDetail.value;
  if (!course || !detail) return;

  const { day, section } = parseSlotFromTime(course?.time ?? detail?.time);
  const dayIndex = weekdayChoices.findIndex(o => o.text === day);
  const sectionIndex = timeSectionChoices.findIndex(o => o.text === section);

  editWeekdayIndex.value = dayIndex >= 0 ? dayIndex : 0;
  editTimeSectionIndex.value = sectionIndex >= 0 ? sectionIndex : 0;

  const prefix = `${weekdayChoices[editWeekdayIndex.value].text}${timeSectionChoices[editTimeSectionIndex.value].text}`;
  editBeginTime.value = String(detail?.time ?? '').replace(prefix, '').trim();

  const dateText = String(detail?.date ?? '').trim();
  if (!dateText || dateText === '无' || dateText === '-') {
    editStartDate.value = '';
    editEndDate.value = '';
  } else if (dateText.includes('至')) {
    const [s, e] = dateText.split('至');
    editStartDate.value = String(s ?? '').trim();
    editEndDate.value = String(e ?? '').trim();
  } else {
    editStartDate.value = '';
    editEndDate.value = '';
  }

  timeEditorVisible.value = true;
};

const openPlaceEditor = () => {
  const detail = activeDetail.value;
  if (!detail) return;
  editPlace.value = String(detail?.place ?? '').trim();
  placeEditorVisible.value = true;
};

const openDateEditor = () => {
  const detail = activeDetail.value;
  if (!detail) return;
  const dateText = String(detail?.date ?? '').trim();
  if (!dateText || dateText === '无' || dateText === '-') {
    editStartDate.value = '';
    editEndDate.value = '';
  } else if (dateText.includes('至')) {
    const [s, e] = dateText.split('至');
    editStartDate.value = String(s ?? '').trim();
    editEndDate.value = String(e ?? '').trim();
  } else {
    editStartDate.value = '';
    editEndDate.value = '';
  }
  dateEditorVisible.value = true;
};

const onEditWeekdayChange = (e) => {
  editWeekdayIndex.value = Number(e?.detail?.value ?? 0);
};

const onEditTimeSectionChange = (e) => {
  editTimeSectionIndex.value = Number(e?.detail?.value ?? 0);
};

const onEditStartDateChange = (e) => {
  editStartDate.value = String(e?.detail?.value ?? '').trim();
};

const onEditEndDateChange = (e) => {
  editEndDate.value = String(e?.detail?.value ?? '').trim();
};

const clearEditDates = () => {
  editStartDate.value = '';
  editEndDate.value = '';
};

const formatDateRange = (startDate, endDate) => {
  const s = String(startDate ?? '').trim();
  const e = String(endDate ?? '').trim();
  if (!s && !e) return '无';
  if (s && e) return `${s}至${e}`;
  return `${s || '未设置'}至${e || '未设置'}`;
};

const currentScheduleFields = () => {
  const course = activeCourse.value;
  const detail = activeDetail.value;
  const { day, section } = parseSlotFromTime(course?.time ?? detail?.time);
  const weekday = weekdayChoices.find(o => o.text === day)?.value ?? 1;
  const timeSection = timeSectionChoices.find(o => o.text === section)?.value ?? 1;
  const prefix = `${day}${section}`;
  const beginTime = String(detail?.time ?? '').replace(prefix, '').trim();
  return { weekday, timeSection, beginTime };
};

const applyLocalUpdates = ({ weekday, timeSection, beginTime, place, startDate, endDate }) => {
  const course = activeCourse.value;
  const key = courseKey(course);
  const dayText = weekdayChoices.find(o => o.value === weekday)?.text ?? '周一';
  const sectionText = timeSectionChoices.find(o => o.value === timeSection)?.text ?? '上午';
  const newCourseTime = `${dayText}${sectionText}`;
  const newDetailTime = `${dayText}${sectionText}${String(beginTime ?? '').trim()}`;
  const newDate = formatDateRange(startDate, endDate);

  if (key && detailByKey.value[key]) {
    detailByKey.value = {
      ...detailByKey.value,
      [key]: {
        ...detailByKey.value[key],
        time: newDetailTime,
        place: place ?? detailByKey.value[key]?.place,
        date: newDate,
      },
    };
  }

  activeDetail.value = {
    ...(activeDetail.value || {}),
    time: newDetailTime,
    place: place ?? activeDetail.value?.place,
    date: newDate,
  };

  courses.value = (Array.isArray(courses.value) ? courses.value : []).map(c => {
    if (courseKey(c) !== key) return c;
    return { ...c, time: newCourseTime };
  });
};

const saveSchedulePatch = async (patch) => {
  const course = activeCourse.value;
  if (!course?.online_course_id) return false;

  const current = currentScheduleFields();
  const weekday = patch.weekday ?? current.weekday;
  const timeSection = patch.timeSection ?? current.timeSection;
  const beginTime = patch.beginTime ?? current.beginTime;
  const place = patch.place;
  const startDate = patch.startDate;
  const endDate = patch.endDate;

  if (course?.__isTest) {
    const dayText = weekdayChoices.find(o => o.value === weekday)?.text ?? weekdayChoices[0].text;
    const sectionText = timeSectionChoices.find(o => o.value === timeSection)?.text ?? timeSectionChoices[0].text;
    const newCourseTime = `${dayText}${sectionText}`;
    const newDetailTime = `${dayText}${sectionText}${String(beginTime ?? '').trim()}`;
    const newDate = formatDateRange(startDate, endDate);

    devTestCourse.value = {
      ...devTestCourse.value,
      time: newCourseTime,
    };
    devTestDetail.value = {
      ...devTestDetail.value,
      time: newDetailTime,
      place: place ?? devTestDetail.value.place,
      date: newDate,
    };

    const key = courseKey(course);
    if (key) {
      detailByKey.value = {
        ...detailByKey.value,
        [key]: devTestDetail.value,
      };
    }
    activeDetail.value = devTestDetail.value;

    Taro.showToast({ title: '已保存（本地）', icon: 'success' });
    return true;
  }

  editSaving.value = true;
  Taro.showLoading({ title: '保存中...' });
  try {
    const res = await updateOnlineCourseScheduleV1({
      online_course_id: course.online_course_id,
      weekday,
      timeSection,
      beginTime,
      place,
      startDate,
      endDate,
    });
    if (res?.state !== 'success') throw new Error(res?.reason || '保存失败');

    applyLocalUpdates({ weekday, timeSection, beginTime, place, startDate, endDate });
    Taro.showToast({ title: '已保存', icon: 'success' });
    return true;
  } catch (e) {
    console.error(e);
    Taro.showToast({ title: String(e?.message || e || '保存失败'), icon: 'none' });
    return false;
  } finally {
    Taro.hideLoading();
    editSaving.value = false;
  }
};

const saveTimeEdit = async () => {
  const weekday = weekdayChoices[editWeekdayIndex.value]?.value;
  const timeSection = timeSectionChoices[editTimeSectionIndex.value]?.value;
  if (!weekday || !timeSection) return;
  const ok = await saveSchedulePatch({
    weekday,
    timeSection,
    beginTime: String(editBeginTime.value ?? '').trim(),
  });
  if (ok) timeEditorVisible.value = false;
};

const savePlaceEdit = async () => {
  const ok = await saveSchedulePatch({ place: String(editPlace.value ?? '').trim() });
  if (ok) placeEditorVisible.value = false;
};

const saveDateEdit = async () => {
  const ok = await saveSchedulePatch({
    startDate: String(editStartDate.value ?? '').trim(),
    endDate: String(editEndDate.value ?? '').trim(),
  });
  if (ok) dateEditorVisible.value = false;
};

const openSearch = () => {
  searchVisible.value = true;
  searchQuery.value = '';
};

const toggleDevTest = () => {
  devTestEnabled.value = !devTestEnabled.value;
  try {
    Taro.setStorageSync('admin:schedule:devTestEnabled', devTestEnabled.value);
  } catch (e) {
    // ignore storage failures
  }
};

const editTip = computed(() => {
  if (activeCourse.value?.__isTest) return '测试课仅在开发环境可见，保存只会更新本地显示，不会写入服务器。';
  return '保存后会更新该课程的排课时间、地点与开课日期；教师冲突会被后端拦截。';
});

onMounted(() => {
  if (isDev) {
    try {
      const v = Taro.getStorageSync('admin:schedule:devTestEnabled');
      devTestEnabled.value = typeof v === 'boolean' ? v : true;
    } catch (e) {
      devTestEnabled.value = true;
    }
  }
  loadCourses();
  Taro.setNavigationBarTitle({ title: '排课' });
});
</script>

<style lang="scss">
.schedule {
  padding: 12px;
}

.empty-state {
  text-align: center;
  padding: 16px;
  color: #999;
  font-size: 14px;
}
.empty-state.error {
  color: #d03050;
}

.grid-scroll {
  margin-top: 10px;
  border-radius: 10px;
  background: #fff;
}
.grid {
  display: flex;
  flex-direction: column;
  min-width: 720px;
}
.row {
  display: flex;
}
.row.header .cell {
  height: 40px;
  min-height: 40px;
  padding: 0;
}
.cell {
  box-sizing: border-box;
  border-right: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  padding: 8px 6px;
  width: 90px;
  height: 62px;
  min-height: 62px;
  overflow: hidden;
}
.cell.corner {
  width: 84px;
  padding: 0;
  background: #fafafa;
}
.cell.day {
  text-align: center;
  font-weight: 600;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  font-size: 13px;
}
.cell.section {
  width: 84px;
  font-weight: 600;
  background: #fafafa;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  white-space: nowrap;
  font-size: 13px;
  line-height: 1;
}
.cell.slot {
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
}
.slot-count {
  font-size: 18px;
  font-weight: 700;
  line-height: 18px;
  color: #1d1d1f;
}
.slot-count.empty {
  color: #c8c8c8;
}

.popup {
  height: 78vh;
  padding: 12px;
  box-sizing: border-box;
  background: #fff;
}
.popup-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.popup-title {
  font-size: 16px;
  font-weight: 700;
}
.popup-actions {
  display: flex;
  gap: 8px;
}

.search-meta {
  margin: 8px 0 0;
  color: #666;
  font-size: 12px;
}

.field-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
}
.field-label {
  width: 72px;
  color: #1d1d1f;
  font-size: 14px;
  white-space: nowrap;
}
.field-input {
  flex: 1;
  height: 36px;
  padding: 0 10px;
  border: 1px solid #eee;
  border-radius: 8px;
  font-size: 14px;
  background: #fff;
}
.edit-tip {
  margin-top: 10px;
  color: #888;
  font-size: 12px;
  line-height: 1.4;
}

.edit-actions {
  padding: 8px 0;
  display: flex;
  justify-content: flex-end;
}
</style>
