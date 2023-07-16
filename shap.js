"use strict";

import * as THREE from "three";
import * as d3geo from "d3-geo";
import { randomColor } from "./tool.js";

// 用于计算整个图形的中心位置
let mapSideInfo;

// 中心坐标，用于到时候将图形绘制到坐标系原点计算使用
let centerPos = {};

// 墨卡托投影转换方法
let merTrans;

// 波纹占地区比例
const waveRate = 0.05;

/**
 * @description 计算中心位置、四边位置，请务必在调用drawMap之前调用
 * @param {*} geoJson 请求获取到的geoJson数据
 */
const calcSide = (geoJson) => {
  const { features } = geoJson;

  // 每次计算恢复初始值，以免下钻的时候计算中心点错误
  mapSideInfo = {
    minlon: Infinity,
    maxlon: -Infinity,
    minlat: Infinity,
    maxlat: -Infinity,
  };

  features.forEach((feature) => {
    dealWithCoord(feature.geometry, (lonlatArr) => {
      lonlatArr.forEach(([lon, lat]) => {
        if (lon > mapSideInfo.maxlon) mapSideInfo.maxlon = lon;
        if (lon < mapSideInfo.minlon) mapSideInfo.minlon = lon;
        if (lat > mapSideInfo.maxlat) mapSideInfo.maxlat = lat;
        if (lat < mapSideInfo.minlat) mapSideInfo.minlat = lat;
      });
    });
  });

  centerPos = {
    x: (mapSideInfo.maxlon + mapSideInfo.minlon) / 2,
    y: (mapSideInfo.maxlat + mapSideInfo.minlat) / 2,
  };

  merTrans = d3geo
    .geoMercator()
    .scale(180)
    .center([centerPos.x, centerPos.y])
    .translate([0, 0]);
};

/**
 * @description 根据某地区经纬度信息绘制地图板块
 * @param {*} feature 获取板块地图的子板块信息
 * @returns
 */
const drawMap = (feature) =>
  new Promise((resolve) => {
    const { geometry, properties } = feature;
    const meshArray = [];

    dealWithCoord(geometry, (lonlatArr) => {
      const shap = drawPlan(lonlatArr);
      // 几何体
      const geo = new THREE.ExtrudeGeometry(shap, {
        bevelEnabled: false,
      });

      // 材质
      const material = new THREE.MeshBasicMaterial({
        color: randomColor(),
      });
      // 备份一份颜色
      material.backup = material.color.getHex();
      // 物体
      const mesh = new THREE.Mesh(geo, material);
      // 记录该地区的名字
      mesh.name = properties.name;
      // 用于获取该地区的详细信息
      mesh.adcode = properties.adcode;

      meshArray.push(mesh);
    });

    resolve(meshArray);
  });

/**
 * @description 根据地图区域的最小变计算半径
 * @param {*} rate 百分比
 * @returns
 */
const getRadius = (rate) => {
  const lonDiff = mapSideInfo.maxlon - mapSideInfo.minlon;
  const latDiff = mapSideInfo.maxlat - mapSideInfo.minlat;

  return Math.min(lonDiff, latDiff) * rate;
};

/**
 * @description 绘制mark
 * @param {*} feature 获取板块地图的子板块信息
 * @returns
 */
const drawMark = (feature) =>
  new Promise((resolve) => {
    const radius = getRadius(waveRate);
    const { properties } = feature;
    const [x, y] = merTrans(properties.center);
    const geometry = new THREE.CircleGeometry(radius);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffa500,
      side: THREE.BackSide,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    resolve(mesh);
  });

/**
 * @description 绘制mark
 * @param {*} feature 获取板块地图的子板块信息
 * @returns
 */
const drawWave = (feature) =>
  new Promise((resolve) => {
    const radius = getRadius(waveRate);
    const { properties } = feature;
    const [x, y] = merTrans(properties.center);
    const geometry = new THREE.CircleGeometry(radius / 0.2);

    const waveTexture = new THREE.CanvasTexture(getWave());

    const material = new THREE.MeshBasicMaterial({
      map: waveTexture,
      transparent: true,
      opacity: 1,
      side: THREE.BackSide,
      depthTest: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, 0);
    resolve(mesh);
  });

/**
 * @description 处理坐标循环
 * @param {*} geometry
 * @param {*} callback 回调函数返回的是经经纬度数组的集合
 */
const dealWithCoord = (geometry, callback) => {
  const { type, coordinates } = geometry;

  // 多面处理
  if (type === "MultiPolygon") {
    coordinates.forEach((polyArray) => {
      polyArray.forEach((lonlatArr) => {
        callback(lonlatArr);
      });
    });
  } else
    coordinates.forEach((lonlatArr) => {
      callback(lonlatArr);
    });
};

/**
 * @description 根据点绘制二维形状平面
 * @param {*} lonlatArr  经纬度坐标数组集合
 */
const drawPlan = (lonlatArr) => {
  // 可以理解为canvas的绘制形状，moveTo、lineTo
  const shap = new THREE.Shape();

  lonlatArr.forEach((lonlat, index) => {
    const [x, y] = merTrans(lonlat);
    if (!index) shap.moveTo(x, y);
    else shap.lineTo(x, y);
  });

  return shap;
};

/**
 * @description 波纹
 * @returns HtmlCanvasElement
 */
const getWave = () => {
  const radius = getRadius(waveRate);
  const canvas = document.createElement("canvas");
  canvas.width = radius * 1000;
  canvas.height = radius * 1000;
  const ctx = canvas.getContext("2d");

  const center = {
    x: canvas.width / 2,
    y: canvas.height / 2,
  };

  const waveMaxRadius = canvas.width / 2;

  ctx.strokeStyle = "red";

  ctx.beginPath();
  ctx.lineWidth = waveMaxRadius / 6;
  ctx.arc(center.x, center.y, waveMaxRadius * 0.3, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = waveMaxRadius / 12;
  ctx.arc(center.x, center.y, waveMaxRadius * 0.6, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.lineWidth = waveMaxRadius / 18;
  ctx.arc(center.x, center.y, waveMaxRadius * 0.9, 0, 2 * Math.PI);
  ctx.stroke();

  return canvas;
};

export { drawMap, calcSide, drawMark, drawWave };
