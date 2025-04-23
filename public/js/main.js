document.addEventListener('DOMContentLoaded', () => {
  // 获取所有的选项卡元素
  const tabs = document.querySelectorAll('[data-bs-toggle="tab"]');
  
  // 为每个选项卡添加点击事件
  tabs.forEach(tab => {
    tab.addEventListener('shown.bs.tab', (event) => {
      // 保存当前激活的选项卡到本地存储
      localStorage.setItem('activeTab', event.target.getAttribute('href'));
    });
  });
  
  // 从本地存储中获取之前激活的选项卡
  const activeTab = localStorage.getItem('activeTab');
  
  // 如果有保存的选项卡,则激活它
  if (activeTab) {
    const tab = document.querySelector(`[href="${activeTab}"]`);
    if (tab) {
      const bsTab = new bootstrap.Tab(tab);
      bsTab.show();
    }
  }

  // 图表初始化 (如果页面上有图表元素)
  const chartElement = document.getElementById('projectProgressChart');
  if (chartElement) {
    initProjectProgressChart();
  }

  // 表单验证
  const forms = document.querySelectorAll('.needs-validation');
  Array.from(forms).forEach(form => {
    form.addEventListener('submit', event => {
      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      }
      form.classList.add('was-validated');
    }, false);
  });
});

// 项目进度图表初始化
function initProjectProgressChart() {
  // 这里可以使用实际的图表库(如Chart.js)进行图表初始化
  console.log('项目进度图表初始化');
  
  // 示例:如果使用Chart.js,可以实现如下
  // const ctx = document.getElementById('projectProgressChart').getContext('2d');
  // new Chart(ctx, {
  //   type: 'bar',
  //   data: {
  //     labels: ['已完成', '进行中', '未开始', '已延期'],
  //     datasets: [{
  //       label: '任务数量',
  //       data: [12, 19, 3, 5],
  //       backgroundColor: [
  //         'rgba(75, 192, 192, 0.6)',
  //         'rgba(54, 162, 235, 0.6)',
  //         'rgba(255, 206, 86, 0.6)',
  //         'rgba(255, 99, 132, 0.6)'
  //       ],
  //       borderColor: [
  //         'rgba(75, 192, 192, 1)',
  //         'rgba(54, 162, 235, 1)',
  //         'rgba(255, 206, 86, 1)',
  //         'rgba(255, 99, 132, 1)'
  //       ],
  //       borderWidth: 1
  //     }]
  //   },
  //   options: {
  //     scales: {
  //       y: {
  //         beginAtZero: true
  //       }
  //     }
  //   }
  // });
}

// 确认删除函数
function confirmDelete(event, itemType) {
  if (!confirm(`确定要删除此${itemType}吗?`)) {
    event.preventDefault();
  }
}

// 动态添加表单项
function addFormItem(containerId, template) {
  const container = document.getElementById(containerId);
  const itemCount = container.children.length;
  const html = template.replace(/__INDEX__/g, itemCount);
  
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  container.appendChild(tempDiv.firstElementChild);
}

// 移除表单项
function removeFormItem(button) {
  const item = button.closest('.form-item');
  item.remove();
} 