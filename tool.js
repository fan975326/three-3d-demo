"use strict";

import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { drawMap, calcSide, drawMark, drawWave } from "./shap.js";

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

// 上一次处理的地图块列表
let beforeMapList = [];

// 获取随机蓝绿色
const randomColor = () => {
  var blue = Math.floor(Math.random() * 256);
  var green = Math.floor(Math.random() * 256);

  return `rgb(0,${green},${blue})`;
};

// 场景,用来存放物体的地方
const scene = new THREE.Scene();

// 透视相机
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);

// 设置相机的位置
camera.position.set(0, 0, 20);

const renderer = new THREE.WebGLRenderer(); // webgl渲染器

renderer.setSize(window.innerWidth, window.innerHeight);

// 可以使得相机围绕物体进行旋转
new OrbitControls(camera, renderer.domElement);

// 坐标系轴线
// const axis = new THREE.AxesHelper();

// 将坐标系添加到场景中
// scene.add(axis);

// 触发渲染的方法
const reRender = () => {
  // 渲染器通过相机展示拍摄到的场景内容
  renderer.render(scene, camera);
};

// 动画
const animate = (callback) => {
  if (callback && typeof callback === "function") callback();
  requestAnimationFrame(() => {
    animate(callback);
  });
  reRender();
};

// 将内容渲染到页面中
document.body.appendChild(renderer.domElement);

/**
 * @description 获取地图数据
 * @param adcode 地区code
 * @param isFull 是否包含子区域
 */
const getGeoJson = async (adcode, isFull = true) => {
  const response = await fetch(
    `https://geo.datav.aliyun.com/areas_v3/bound/geojson?code=${adcode}${
      isFull ? "_full" : ""
    }`,
    {
      method: "GET",
    }
  );

  return response.json();
};

/**
 * @description 获取鼠标触发过的地图信息
 * @param {*} mouseEvent 鼠标事件
 * @returns
 */
const getSelMap = (mouseEvent) => {
  const mapChildren = scene.children.find(
    (item) => item.describe === "map"
  ).children;

  pointer.x = (mouseEvent.offsetX / mouseEvent.target.clientWidth) * 2 - 1;
  pointer.y = -(mouseEvent.offsetY / mouseEvent.target.clientHeight) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(mapChildren);

  return intersects;
};

/**
 * @description 选中和未选中物体颜色的处理
 * @param {*} mapList 鼠标捕获的物体列表
 */
const dealSelColor = (mapList) => {
  // 上次选中的元素恢复初始颜色
  beforeMapList.forEach((bMap) => {
    const hex = bMap.object.material.backup;
    bMap.object.material.color.setHex(hex);
  });

  // 激活元素改变颜色
  mapList.forEach((map) => {
    map.object.material.color.set(0xffff00);
  });

  beforeMapList = mapList;
};

/**
 * @description 处理tooltip
 * @param {*} mapList 鼠标捕获的物体列表
 * @param {*} mouseEvent 鼠标事件
 */
const dealTooltip = (mapList, mouseEvent) => {
  const { offsetX, offsetY } = mouseEvent;
  const tooltip = document.getElementById("tooltip");
  if (mapList.length) {
    tooltip.style.display = "block";
    tooltip.style.left = offsetX + "px";
    tooltip.style.top = offsetY + "px";

    mapList.forEach((map) => {
      tooltip.innerText = map.object.name;
    });
  } else tooltip.style.display = "none";
};

// 绘制地图的方法
const drawMapFunc = async (geoJson) => {
  // 计算地图信息
  calcSide(geoJson);

  const group = new THREE.Group();
  const markGroup = new THREE.Group();
  const waveGroup = new THREE.Group();
  group.describe = "map";
  markGroup.describe = "mark";
  waveGroup.describe = "wave";
  group.rotateX(Math.PI);
  markGroup.rotateX(Math.PI);
  waveGroup.rotateX(Math.PI);

  geoJson.features.forEach(async (feature) => {
    const meshArr = await drawMap(feature);
    const mark = await drawMark(feature);
    const wave = await drawWave(feature);
    group.add(...meshArr);
    markGroup.add(mark);
    waveGroup.add(wave);
  });

  scene.add(group, markGroup, waveGroup);
};

export {
  scene,
  reRender,
  animate,
  getGeoJson,
  randomColor,
  getSelMap,
  dealTooltip,
  dealSelColor,
  drawMapFunc,
};
