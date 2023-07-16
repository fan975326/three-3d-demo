"use strict";

import {
  animate,
  getGeoJson,
  scene,
  getSelMap,
  dealTooltip,
  dealSelColor,
  drawMapFunc,
} from "./tool.js";

// 页面中历史展示的内容
let historyMeshList = [];
let scale = 1;

animate(() => {
  const waveObject = scene.children.find(
    (object) => object.describe === "wave"
  );
  if (waveObject) {
    waveObject.children.forEach((mesh) => {
      if (mesh.material.opacity > 0) {
        mesh.material.opacity -= 0.005;
        scale += 0.00006;
      } else {
        mesh.material.opacity = 1;
        scale = 1;
      }
      mesh.scale.set(scale, scale, 1);
    });
  }
});

// 获取河南地图信息
const json = await getGeoJson(410000);

console.log("json", json);

// 绘制地图
drawMapFunc(json);

document.body.addEventListener("mousemove", (mouseEvent) => {
  const mapList = getSelMap(mouseEvent);

  // 处理选中颜色
  dealSelColor(mapList);

  // 处理tooltip展示
  dealTooltip(mapList, mouseEvent);
});

document.body.addEventListener("mousedown", async (mouseEvent) => {
  const mapList = getSelMap(mouseEvent);

  // 不存在点击区域的话不触发
  if (!mapList.length) return;

  // 获取选中区域的geoJson数据
  const activeArea = await getGeoJson(mapList[0].object.adcode);

  // 记录当前页面展示内容数据
  historyMeshList = [...scene.children];
  // 展示返回按钮
  document.getElementById("back").style.display = "block";

  // 移除当前页面上展示的内容
  scene.remove(...scene.children);
  // 渲染获取到的最新区域地图
  drawMapFunc(activeArea);
});

// 点击返回按钮触发
document.getElementById("back").addEventListener("mousedown", () => {
  //移除当前展示的区域
  scene.remove(...scene.children);
  // 将历史展示内容添加到场景中
  scene.add(...historyMeshList);
  // 初始化历史数据数组
  historyMeshList = [];
  // 返回后隐藏返回按钮
  document.getElementById("back").style.display = "none";
});
