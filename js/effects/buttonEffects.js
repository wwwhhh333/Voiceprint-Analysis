function createRipple(event) {
    const button = event.currentTarget;
    
    //如果按钮被禁用，不创建涟漪效果
    if (button.disabled) return;
    
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    
    //获取点击位置相对于按钮的坐标
    const rect = button.getBoundingClientRect();
    circle.style.left = `${event.clientX - rect.left}px`;
    circle.style.top = `${event.clientY - rect.top}px`;
    circle.style.width = circle.style.height = `${diameter}px`;
    
    circle.classList.add("btn-ripple");
    button.appendChild(circle);
    
    //动画结束后移除涟漪元素
    circle.addEventListener("animationend", () => {
        circle.remove();
    });
}

//为所有按钮添加涟漪效果
document.querySelectorAll('button, .upload-btn').forEach(button => {
    button.addEventListener('click', createRipple);
}); 