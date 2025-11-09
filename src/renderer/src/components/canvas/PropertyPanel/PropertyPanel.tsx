import React, { useEffect, useRef, useState } from 'react';
import { ShapeData } from '../../../types/canvas';
import styles from './PropertyPanel.module.css';
import { useCanvas } from '../../../hooks/useCanvas';
import { replaceVariablesInBody } from '../../../utils/canvasUtils';

export interface PropertyPanelProps {
  shape: ShapeData | null;
}

export const PropertyPanel: React.FC<PropertyPanelProps> = ({ shape }) => {
  if (!shape) {
    return null;
  }

  // 初次渲染即带入动画，避免先渲染再添加类导致的闪烁
  const [animateClass, setAnimateClass] = useState<string>(styles.animateEnter);
  const prevIdRef = useRef<string | null>(shape.id);

  useEffect(() => {
    // 如果是同一个面板内切换到不同组件：直接切换，无动画
    if (prevIdRef.current !== shape.id) {
      setAnimateClass('');
      prevIdRef.current = shape.id;
      // 切换形状时重置合成状态
      setIsComposing(false);
      isComposingRef.current = false;
      return;
    }
  }, [shape]);

  const forceRerender = useState(0)[1];
  const { deleteShape, updateShape } = useCanvas();

  // 自定义输入/输出文本本地缓冲，避免未成对 JSON 在输入中被强制回退
  const [inputDataText, setInputDataText] = useState<string>(shape.inputData ? JSON.stringify(shape.inputData, null, 2) : '');
  const [outputDataText, setOutputDataText] = useState<string>(shape.outputData ? JSON.stringify(shape.outputData, null, 2) : '');
  // 箭头用途本地缓冲与合成态
  const [arrowNoteText, setArrowNoteText] = useState<string>(shape.type === 'arrow' ? ((shape as any).note || '') : '');
  const [isComposing, setIsComposing] = useState<boolean>(false);
  const isComposingRef = useRef<boolean>(false); // 用于在 onChange 中获取最新的合成状态
  // 标题/URL/属性名的本地缓冲，支持中文输入法
  const [titleText, setTitleText] = useState<string>(shape.title || '');
  const [apiUrlText, setApiUrlText] = useState<string>(shape.apiUrl || '');
  // 规范化输入/输出属性为多组格式
  const normalizePropsToGroups = (props: string[] | string[][] | undefined): string[][] => {
    if (!props) return [];
    if (Array.isArray(props) && props.length > 0 && Array.isArray(props[0])) {
      return props as string[][];
    }
    if (Array.isArray(props)) {
      return [props as string[]];
    }
    return [];
  };
  const [inputPropsTexts, setInputPropsTexts] = useState<string[][]>(() => normalizePropsToGroups(shape.inputProps));
  const [outputPropsTexts, setOutputPropsTexts] = useState<string[][]>(() => normalizePropsToGroups(shape.outputProps));
  const [descriptionText, setDescriptionText] = useState<string>(shape.description || '');
  // 每个输入组的输入模式（数组索引对应输入组索引）
  const [inputModes, setInputModes] = useState<('props' | 'custom' | 'api')[]>(() => {
    if (shape.inputModes && Array.isArray(shape.inputModes)) {
      return shape.inputModes;
    }
    // 向后兼容：如果没有inputModes，使用全局inputMode
    const globalMode = shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props');
    const groups = normalizePropsToGroups(shape.inputProps);
    return groups.map(() => globalMode);
  });
  // 每个输出组的输出模式（数组索引对应输出组索引）
  const [outputModes, setOutputModes] = useState<('props' | 'custom' | 'api')[]>(() => {
    if (shape.outputModes && Array.isArray(shape.outputModes)) {
      return shape.outputModes;
    }
    // 向后兼容：如果没有outputModes，使用全局outputMode
    const globalMode = shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'));
    const groups = normalizePropsToGroups(shape.outputProps);
    return groups.map(() => globalMode);
  });
  
  // 每个输出组的API配置（数组索引对应输出组索引）
  const [outputApiConfigs, setOutputApiConfigs] = useState<Array<{
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiUrl?: string;
    apiBody?: string;
    lastRunAt?: number;
  }>>(() => {
    if (shape.outputApiConfigs && Array.isArray(shape.outputApiConfigs)) {
      return shape.outputApiConfigs;
    }
    // 向后兼容：如果没有outputApiConfigs，从全局API配置创建
    const groups = normalizePropsToGroups(shape.outputProps);
    return groups.map(() => ({
      apiMethod: shape.apiMethod || 'GET',
      apiUrl: shape.apiUrl || '',
      apiBody: shape.apiBody || '',
      lastRunAt: shape.lastRunAt,
    }));
  });
  
  // 每个输入组的API配置（数组索引对应输入组索引）
  const [inputApiConfigs, setInputApiConfigs] = useState<Array<{
    apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    apiUrl?: string;
    apiBody?: string;
    lastRunAt?: number;
  }>>(() => {
    if (shape.inputApiConfigs && Array.isArray(shape.inputApiConfigs)) {
      return shape.inputApiConfigs;
    }
    // 向后兼容：如果没有inputApiConfigs，从全局API配置创建
    const groups = normalizePropsToGroups(shape.inputProps);
    return groups.map(() => ({
      apiMethod: shape.apiMethod || 'GET',
      apiUrl: shape.apiUrl || '',
      apiBody: shape.apiBody || '',
      lastRunAt: shape.lastRunAt,
    }));
  });
  
  // 每个输入组的自定义JSON数据（数组索引对应输入组索引）
  const [inputDataGroups, setInputDataGroups] = useState<string[]>(() => {
    if (shape.inputDataGroups && Array.isArray(shape.inputDataGroups)) {
      return shape.inputDataGroups.map((data: any) => JSON.stringify(data, null, 2));
    }
    // 向后兼容：如果没有inputDataGroups，从全局inputData创建
    const groups = normalizePropsToGroups(shape.inputProps);
    if (shape.inputData && groups.length > 0) {
      return groups.map(() => JSON.stringify(shape.inputData || {}, null, 2));
    }
    return groups.map(() => '{}');
  });
  
  // 每个输出组的自定义JSON数据（数组索引对应输出组索引）
  const [outputDataGroups, setOutputDataGroups] = useState<string[]>(() => {
    if (shape.outputDataGroups && Array.isArray(shape.outputDataGroups)) {
      return shape.outputDataGroups.map((data: any) => JSON.stringify(data, null, 2));
    }
    // 向后兼容：如果没有outputDataGroups，从全局outputData创建
    const groups = normalizePropsToGroups(shape.outputProps);
    if (shape.outputData && groups.length > 0) {
      return groups.map(() => JSON.stringify(shape.outputData || {}, null, 2));
    }
    return groups.map(() => '{}');
  });

  useEffect(() => {
    if (isComposing) return; // 合成期间不从全局回填，避免打断输入
    // 只在值不同时才更新，避免不必要的 setState 导致闪烁
    const newInputDataText = shape.inputData ? JSON.stringify(shape.inputData, null, 2) : '';
    if (newInputDataText !== inputDataText) setInputDataText(newInputDataText);
    const newOutputDataText = shape.outputData ? JSON.stringify(shape.outputData, null, 2) : '';
    if (newOutputDataText !== outputDataText) setOutputDataText(newOutputDataText);
    // 当选中目标变化时，同步箭头用途的本地值
    if (shape.type === 'arrow') {
      const newNote = (shape as any).note || '';
      // 使用函数式更新，避免闭包问题
      setArrowNoteText(prev => {
        if (prev !== newNote) return newNote;
        return prev;
      });
    }
    // 同步标题、URL 与属性名本地值
    const newTitle = shape.title || '';
    if (newTitle !== titleText) setTitleText(newTitle);
    const newApiUrl = shape.apiUrl || '';
    if (newApiUrl !== apiUrlText) setApiUrlText(newApiUrl);
    // 比较数组是否变化
    const newInputProps = normalizePropsToGroups(shape.inputProps);
    if (JSON.stringify(newInputProps) !== JSON.stringify(inputPropsTexts)) {
      setInputPropsTexts(newInputProps);
      // 同步更新输入模式数组长度
      const currentModes = shape.inputModes && Array.isArray(shape.inputModes) 
        ? shape.inputModes 
        : (() => {
            const globalMode = shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props');
            return newInputProps.map(() => globalMode);
          })();
      // 如果组数变化，调整模式数组
      if (currentModes.length !== newInputProps.length) {
        const adjustedModes: ('props' | 'custom' | 'api')[] = [];
        for (let i = 0; i < newInputProps.length; i++) {
          adjustedModes[i] = currentModes[i] || 'props';
        }
        setInputModes(adjustedModes);
      } else {
        setInputModes(currentModes);
      }
      // 同步更新API配置数组长度
      const currentApiConfigs = shape.inputApiConfigs && Array.isArray(shape.inputApiConfigs)
        ? shape.inputApiConfigs
        : newInputProps.map(() => ({
            apiMethod: shape.apiMethod || 'GET',
            apiUrl: shape.apiUrl || '',
            apiBody: shape.apiBody || '',
            lastRunAt: shape.lastRunAt,
          }));
      if (currentApiConfigs.length !== newInputProps.length) {
        const adjustedConfigs: Array<{ apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'; apiUrl?: string; apiBody?: string; lastRunAt?: number }> = [];
        for (let i = 0; i < newInputProps.length; i++) {
          adjustedConfigs[i] = currentApiConfigs[i] || { apiMethod: 'GET', apiUrl: '', apiBody: '' };
        }
        setInputApiConfigs(adjustedConfigs);
      } else {
        setInputApiConfigs(currentApiConfigs);
      }
      // 同步更新JSON数据数组长度
      const currentDataGroups = shape.inputDataGroups && Array.isArray(shape.inputDataGroups)
        ? shape.inputDataGroups.map((data: any) => JSON.stringify(data, null, 2))
        : newInputProps.map(() => {
            if (shape.inputData) {
              return JSON.stringify(shape.inputData, null, 2);
            }
            return '{}';
          });
      if (currentDataGroups.length !== newInputProps.length) {
        const adjustedDataGroups: string[] = [];
        for (let i = 0; i < newInputProps.length; i++) {
          adjustedDataGroups[i] = currentDataGroups[i] || '{}';
        }
        setInputDataGroups(adjustedDataGroups);
      } else {
        setInputDataGroups(currentDataGroups);
      }
    }
    const newOutputProps = normalizePropsToGroups(shape.outputProps);
    if (JSON.stringify(newOutputProps) !== JSON.stringify(outputPropsTexts)) {
      setOutputPropsTexts(newOutputProps);
      // 同步更新输出模式数组长度
      const currentModes = shape.outputModes && Array.isArray(shape.outputModes) 
        ? shape.outputModes 
        : (() => {
            const globalMode = shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'));
            return newOutputProps.map(() => globalMode);
          })();
      // 如果组数变化，调整模式数组
      if (currentModes.length !== newOutputProps.length) {
        const adjustedModes: ('props' | 'custom' | 'api')[] = [];
        for (let i = 0; i < newOutputProps.length; i++) {
          adjustedModes[i] = currentModes[i] || 'props';
        }
        setOutputModes(adjustedModes);
      } else {
        setOutputModes(currentModes);
      }
    } else if (shape.outputModes && JSON.stringify(shape.outputModes) !== JSON.stringify(outputModes)) {
      setOutputModes(shape.outputModes);
    }
    // 同步outputApiConfigs
    if (shape.outputApiConfigs && JSON.stringify(shape.outputApiConfigs) !== JSON.stringify(outputApiConfigs)) {
      setOutputApiConfigs(shape.outputApiConfigs);
    }
    // 同步inputModes
    if (shape.inputModes && JSON.stringify(shape.inputModes) !== JSON.stringify(inputModes)) {
      setInputModes(shape.inputModes);
    }
    // 同步inputApiConfigs
    if (shape.inputApiConfigs && JSON.stringify(shape.inputApiConfigs) !== JSON.stringify(inputApiConfigs)) {
      setInputApiConfigs(shape.inputApiConfigs);
    }
    // 同步inputDataGroups
    if (shape.inputDataGroups && Array.isArray(shape.inputDataGroups)) {
      const newDataGroups = shape.inputDataGroups.map((data: any) => JSON.stringify(data, null, 2));
      if (JSON.stringify(newDataGroups) !== JSON.stringify(inputDataGroups)) {
        setInputDataGroups(newDataGroups);
      }
    }
    // 同步outputDataGroups
    if (shape.outputDataGroups && Array.isArray(shape.outputDataGroups)) {
      const newDataGroups = shape.outputDataGroups.map((data: any) => JSON.stringify(data, null, 2));
      if (JSON.stringify(newDataGroups) !== JSON.stringify(outputDataGroups)) {
        setOutputDataGroups(newDataGroups);
      }
    }
  }, [shape.id, shape.title, shape.apiUrl, shape.inputProps, shape.outputProps, shape.outputModes, shape.outputApiConfigs, shape.inputModes, shape.inputApiConfigs, shape.inputDataGroups, shape.outputDataGroups, shape.inputData, shape.outputData, isComposing, shape.type, (shape as any).note]);
  useEffect(() => {
    if (isComposing) return; // 合成期间不从全局回填，避免打断输入
    const newDesc = shape.description || '';
    // 只在值不同时才更新，避免不必要的 setState 导致闪烁
    if (newDesc !== descriptionText) setDescriptionText(newDesc);
  }, [shape.id, shape.description, isComposing]);

  // 处理组内属性的变化
  const handleInputChange = (path: 'inputProps' | 'outputProps', groupIndex: number, propIndex: number, value: string) => {
    if (!shape) return;
    // 先更新本地文本数组，实时显示；在非合成态下同步到全局
    if (path === 'inputProps') {
      const next = inputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? group.map((prop, pIdx) => pIdx === propIndex ? value : prop) : group
      );
      setInputPropsTexts(next);
      // 合成期间不更新全局，避免打断输入法（使用 ref 获取最新状态）
      if (!isComposingRef.current) {
      updateShape(shape.id, { inputProps: next });
      }
    } else {
      const next = outputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? group.map((prop, pIdx) => pIdx === propIndex ? value : prop) : group
      );
      setOutputPropsTexts(next);
      // 合成期间不更新全局，避免打断输入法（使用 ref 获取最新状态）
      if (!isComposingRef.current) {
      updateShape(shape.id, { outputProps: next });
      }
    }
    forceRerender(x => x + 1);
  };

  // 添加组内的属性
  const handleAddProp = (path: 'inputProps' | 'outputProps', groupIndex: number) => {
    if (!shape) return;
    if (path === 'inputProps') {
      const next = inputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? [...group, ''] : group
      );
      setInputPropsTexts(next);
      updateShape(shape.id, { inputProps: next });
    } else {
      const next = outputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? [...group, ''] : group
      );
      setOutputPropsTexts(next);
      updateShape(shape.id, { outputProps: next });
    }
    forceRerender(x => x + 1);
  };

  // 删除组内的属性
  const handleRemoveProp = (path: 'inputProps' | 'outputProps', groupIndex: number, propIndex: number) => {
    if (!shape) return;
    if (path === 'inputProps') {
      const next = inputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? group.filter((_, pIdx) => pIdx !== propIndex) : group
      ).filter(group => group.length > 0 || inputPropsTexts.length === 1); // 至少保留一个组
      setInputPropsTexts(next.length > 0 ? next : [['']]);
      updateShape(shape.id, { inputProps: next.length > 0 ? next : [['']] });
    } else {
      const next = outputPropsTexts.map((group, gIdx) => 
        gIdx === groupIndex ? group.filter((_, pIdx) => pIdx !== propIndex) : group
      ).filter(group => group.length > 0 || outputPropsTexts.length === 1); // 至少保留一个组
      setOutputPropsTexts(next.length > 0 ? next : [['']]);
      updateShape(shape.id, { outputProps: next.length > 0 ? next : [['']] });
    }
    forceRerender(x => x + 1);
  };

  // 添加新的组
  const handleAddGroup = (path: 'inputProps' | 'outputProps') => {
    if (!shape) return;
    if (path === 'inputProps') {
      const next = [...inputPropsTexts, ['']];
      setInputPropsTexts(next);
      // 为新组添加默认输入模式、API配置和JSON数据
      const newModes: ('props' | 'custom' | 'api')[] = [...inputModes, 'props'];
      const newConfigs: Array<{ apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'; apiUrl?: string; apiBody?: string; lastRunAt?: number }> = [...inputApiConfigs, { apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }];
      const newDataGroups = [...inputDataGroups, '{}'];
      setInputModes(newModes);
      setInputApiConfigs(newConfigs);
      setInputDataGroups(newDataGroups);
      updateShape(shape.id, { inputProps: next, inputModes: newModes, inputApiConfigs: newConfigs, inputDataGroups: newDataGroups.map(d => {
        try { return JSON.parse(d); } catch { return {}; }
      })});
    } else {
      const next = [...outputPropsTexts, ['']];
      setOutputPropsTexts(next);
      // 为新组添加默认输出模式、API配置和JSON数据
      const newModes: ('props' | 'custom' | 'api')[] = [...outputModes, 'props'];
      const newConfigs: Array<{ apiMethod?: 'GET' | 'POST' | 'PUT' | 'DELETE'; apiUrl?: string; apiBody?: string; lastRunAt?: number }> = [...outputApiConfigs, { apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }];
      const newDataGroups = [...outputDataGroups, '{}'];
      setOutputModes(newModes);
      setOutputApiConfigs(newConfigs);
      setOutputDataGroups(newDataGroups);
      updateShape(shape.id, { outputProps: next, outputModes: newModes, outputApiConfigs: newConfigs, outputDataGroups: newDataGroups.map(d => {
        try { return JSON.parse(d); } catch { return {}; }
      })});
    }
    forceRerender(x => x + 1);
  };

  // 删除组
  const handleRemoveGroup = (path: 'inputProps' | 'outputProps', groupIndex: number) => {
    if (!shape) return;
    if (path === 'inputProps') {
      const next = inputPropsTexts.filter((_, gIdx) => gIdx !== groupIndex);
      // 同时删除对应的输入模式、API配置和JSON数据
      const nextModes = inputModes.filter((_, gIdx) => gIdx !== groupIndex);
      const nextConfigs = inputApiConfigs.filter((_, gIdx) => gIdx !== groupIndex);
      const nextDataGroups = inputDataGroups.filter((_, gIdx) => gIdx !== groupIndex);
      // 至少保留一个组
      if (next.length === 0) {
        setInputPropsTexts([['']]);
        setInputModes(['props']);
        setInputApiConfigs([{ apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }]);
        setInputDataGroups(['{}']);
        updateShape(shape.id, { inputProps: [['']], inputModes: ['props'], inputApiConfigs: [{ apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }], inputDataGroups: [{}] });
      } else {
        setInputPropsTexts(next);
        setInputModes(nextModes);
        setInputApiConfigs(nextConfigs);
        setInputDataGroups(nextDataGroups);
        updateShape(shape.id, { inputProps: next, inputModes: nextModes, inputApiConfigs: nextConfigs, inputDataGroups: nextDataGroups.map(d => {
          try { return JSON.parse(d); } catch { return {}; }
        })});
      }
    } else {
      const next = outputPropsTexts.filter((_, gIdx) => gIdx !== groupIndex);
      // 同时删除对应的输出模式、API配置和JSON数据
      const nextModes = outputModes.filter((_, gIdx) => gIdx !== groupIndex);
      const nextConfigs = outputApiConfigs.filter((_, gIdx) => gIdx !== groupIndex);
      const nextDataGroups = outputDataGroups.filter((_, gIdx) => gIdx !== groupIndex);
      // 至少保留一个组
      if (next.length === 0) {
        setOutputPropsTexts([['']]);
        setOutputModes(['props']);
        setOutputApiConfigs([{ apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }]);
        setOutputDataGroups(['{}']);
        updateShape(shape.id, { outputProps: [['']], outputModes: ['props'], outputApiConfigs: [{ apiMethod: 'GET' as const, apiUrl: '', apiBody: '' }], outputDataGroups: [{}] });
      } else {
        setOutputPropsTexts(next);
        setOutputModes(nextModes);
        setOutputApiConfigs(nextConfigs);
        setOutputDataGroups(nextDataGroups);
        updateShape(shape.id, { outputProps: next, outputModes: nextModes, outputApiConfigs: nextConfigs, outputDataGroups: nextDataGroups.map(d => {
          try { return JSON.parse(d); } catch { return {}; }
        })});
      }
    }
    forceRerender(x => x + 1);
  };

  const handleNodeTitleChange = (value: string) => {
    if (!shape) return;
    setTitleText(value);
    // 合成期间不更新全局，避免打断输入法
    if (!isComposingRef.current) {
    updateShape(shape.id, { title: value });
    }
    forceRerender(x => x + 1);
  };

  // 保留占位：如需逐字段编辑可扩展


  // 处理单个输入组的输入模式变化
  const handleInputModeChange = (groupIndex: number, mode: 'props' | 'custom' | 'api') => {
    if (!shape) return;
    const newModes = [...inputModes];
    newModes[groupIndex] = mode;
    setInputModes(newModes);
    updateShape(shape.id, { inputModes: newModes });
    forceRerender(x => x + 1);
  };

  // 处理单个输出组的输出模式变化
  const handleOutputModeChange = (groupIndex: number, mode: 'props' | 'custom' | 'api') => {
    if (!shape) return;
    const newModes = [...outputModes];
    newModes[groupIndex] = mode;
    setOutputModes(newModes);
    updateShape(shape.id, { outputModes: newModes });
    forceRerender(x => x + 1);
  };

  // 处理单个输入组的API配置变化
  const handleInputApiConfigChange = (groupIndex: number, key: 'apiMethod' | 'apiUrl' | 'apiBody', value: any) => {
    if (!shape) return;
    const newConfigs = [...inputApiConfigs];
    if (!newConfigs[groupIndex]) {
      newConfigs[groupIndex] = { apiMethod: 'GET', apiUrl: '', apiBody: '' };
    }
    newConfigs[groupIndex] = { ...newConfigs[groupIndex], [key]: value };
    setInputApiConfigs(newConfigs);
    // 合成期间不更新全局，避免打断输入法（使用 ref 获取最新状态）
    if (!isComposingRef.current) {
      updateShape(shape.id, { inputApiConfigs: newConfigs });
      }
    forceRerender(x => x + 1);
  };

  // 处理单个输出组的API配置变化
  const handleOutputApiConfigChange = (groupIndex: number, key: 'apiMethod' | 'apiUrl' | 'apiBody', value: any) => {
    if (!shape) return;
    const newConfigs = [...outputApiConfigs];
    if (!newConfigs[groupIndex]) {
      newConfigs[groupIndex] = { apiMethod: 'GET', apiUrl: '', apiBody: '' };
    }
    newConfigs[groupIndex] = { ...newConfigs[groupIndex], [key]: value };
    setOutputApiConfigs(newConfigs);
    // 合成期间不更新全局，避免打断输入法（使用 ref 获取最新状态）
    if (!isComposingRef.current) {
      updateShape(shape.id, { outputApiConfigs: newConfigs });
    }
    forceRerender(x => x + 1);
  };
  
  // 运行指定输入组的API
  const runInputApi = async (groupIndex: number) => {
    if (!shape) return;
    const config = inputApiConfigs[groupIndex];
    if (!config || !config.apiUrl) return;
    
    try {
      const method = config.apiMethod || 'GET';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const init: RequestInit = { method, headers };
      if (method !== 'GET' && config.apiBody) {
        // 替换Body中的变量
        const bodyWithVars = replaceVariablesInBody(config.apiBody, {
          inputData: shape.inputData,
          outputData: shape.outputData,
          inputDataGroups: shape.inputDataGroups,
          outputDataGroups: shape.outputDataGroups,
        });
        init.body = bodyWithVars;
      }
      const res = await fetch(config.apiUrl, init);
      const text = await res.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}
      
      // 更新该输入组的lastRunAt
      const newConfigs = [...inputApiConfigs];
      if (!newConfigs[groupIndex]) {
        newConfigs[groupIndex] = { apiMethod: 'GET', apiUrl: '', apiBody: '' };
      }
      newConfigs[groupIndex] = { ...newConfigs[groupIndex], lastRunAt: Date.now() };
      setInputApiConfigs(newConfigs);
      updateShape(shape.id, { inputApiConfigs: newConfigs });
      
      // 将API结果存储到inputData中
      if (!shape.inputData) {
        shape.inputData = {};
      }
      shape.inputData[`apiResult_${groupIndex}`] = data;
      updateShape(shape.id, { inputData: shape.inputData });
    } catch (e) {
      console.error('API调用失败:', e);
      if (!shape.inputData) {
        shape.inputData = {};
      }
      shape.inputData[`apiError_${groupIndex}`] = String(e);
      updateShape(shape.id, { inputData: shape.inputData });
    }
    forceRerender(x => x + 1);
  };

  // 运行指定输出组的API
  const runOutputApi = async (groupIndex: number) => {
    if (!shape) return;
    const config = outputApiConfigs[groupIndex];
    if (!config || !config.apiUrl) return;
    
    try {
      const method = config.apiMethod || 'GET';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const init: RequestInit = { method, headers };
      if (method !== 'GET' && config.apiBody) {
        // 替换Body中的变量
        const bodyWithVars = replaceVariablesInBody(config.apiBody, {
          inputData: shape.inputData,
          outputData: shape.outputData,
          inputDataGroups: shape.inputDataGroups,
          outputDataGroups: shape.outputDataGroups,
        });
        init.body = bodyWithVars;
      }
      const res = await fetch(config.apiUrl, init);
      const text = await res.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}
      
      // 更新该输出组的lastRunAt
      const newConfigs = [...outputApiConfigs];
      if (!newConfigs[groupIndex]) {
        newConfigs[groupIndex] = { apiMethod: 'GET', apiUrl: '', apiBody: '' };
      }
      newConfigs[groupIndex] = { ...newConfigs[groupIndex], lastRunAt: Date.now() };
      setOutputApiConfigs(newConfigs);
      updateShape(shape.id, { outputApiConfigs: newConfigs });
      
      // 将API结果存储到outputData中
      if (!shape.outputData) {
        shape.outputData = {};
      }
      shape.outputData[`apiResult_${groupIndex}`] = data;
      updateShape(shape.id, { outputData: shape.outputData });
    } catch (e) {
      console.error('API调用失败:', e);
      if (!shape.outputData) {
        shape.outputData = {};
      }
      shape.outputData[`apiError_${groupIndex}`] = String(e);
      updateShape(shape.id, { outputData: shape.outputData });
    }
    forceRerender(x => x + 1);
  };

  const renderNodeProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>名称</h4>
        <input
          type="text"
          value={titleText}
          placeholder="节点名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
          onCompositionStart={() => {
            setIsComposing(true);
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => { 
            const finalValue = (e.target as HTMLInputElement).value;
            setTitleText(finalValue); // 先更新本地状态为最终值
            setIsComposing(false);
            isComposingRef.current = false;
            updateShape(shape.id, { title: finalValue }); // 再更新全局状态
          }}
        />
      </div>

        <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>描述</h4>
        <textarea
          className={styles.propertyTextarea}
          placeholder="节点描述"
          value={descriptionText}
          onChange={(e) => { 
            setDescriptionText(e.target.value); 
            // 合成期间不更新全局，避免打断输入法
            if (!isComposingRef.current) {
              updateShape(shape.id, { description: e.target.value }); 
            }
          }}
          onCompositionStart={() => {
            setIsComposing(true);
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => { 
            const finalValue = (e.target as HTMLTextAreaElement).value;
            setDescriptionText(finalValue); // 先更新本地状态为最终值
            setIsComposing(false);
            isComposingRef.current = false;
            updateShape(shape.id, { description: finalValue }); // 再更新全局状态
          }}
          onBlur={() => { if (!isComposingRef.current) updateShape(shape.id, { description: descriptionText }); }}
        />
              </div>

      {inputPropsTexts && inputPropsTexts.length > 0 && (
        <div className={styles.propertyGroup}>
          <div className={styles.propertyGroupHeader}>
            <h4 className={styles.propertyGroupTitle}>输入</h4>
            <button className={styles.iconButtonSmall} onClick={() => handleAddGroup('inputProps')} title="新增输入组">
            <span className={styles.icon}>＋</span>
          </button>
        </div>


          {inputPropsTexts.map((group, groupIndex) => {
            const currentMode = inputModes[groupIndex] || 'props';
            return (
              <div key={`input-group-${groupIndex}`} className={styles.propertySubGroup}>
                <div className={styles.propertySubGroupHeader}>
                  <span className={styles.propertySubGroupTitle}>输入组 {groupIndex + 1}</span>
                  <div className={styles.propertySubGroupActions}>
                    <select
                      className={styles.propertySelectSmall}
                      value={currentMode}
                      onChange={(e) => handleInputModeChange(groupIndex, e.target.value as 'props' | 'custom' | 'api')}
                    >
                      <option value="props">属性输入</option>
                      <option value="custom">自定义json输入</option>
                      <option value="api">使用API输入</option>
                    </select>
                    {inputPropsTexts.length > 1 && (
                      <button className={styles.iconButtonSmall} onClick={() => handleRemoveGroup('inputProps', groupIndex)} title="删除组">
                        <span className={styles.icon}>×</span>
                      </button>
                    )}
                  </div>
                </div>
                {currentMode === 'props' && (
                  <>
          <div className={styles.propertyList}>
                      {group.map((_, propIndex) => (
                        <div key={`input-${groupIndex}-${propIndex}`} className={styles.propertyItemCompact}>
                <input 
                  type="text" 
                            value={group[propIndex] ?? ''}
                            onChange={(e) => handleInputChange('inputProps', groupIndex, propIndex, e.target.value)}
                            className={styles.propertyInputCompact}
                            placeholder="属性名"
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => { 
                              const finalValue = (e.target as HTMLInputElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleInputChange('inputProps', groupIndex, propIndex, finalValue);
                            }}
                            onBlur={(e) => handleInputChange('inputProps', groupIndex, propIndex, e.target.value)}
                />
                          <button className={styles.iconButtonSmall} onClick={() => handleRemoveProp('inputProps', groupIndex, propIndex)} title="删除">
                  <span className={styles.icon}>×</span>
                </button>
              </div>
            ))}
          </div>
                    <button className={styles.iconButtonSmall} onClick={() => handleAddProp('inputProps', groupIndex)} title="新增属性">
            <span className={styles.icon}>＋</span>
          </button>
                  </>
      )}
                {currentMode === 'custom' && (
          <textarea
                    className={styles.propertyTextareaCompact}
                    placeholder="输入JSON数据"
                    value={inputDataGroups[groupIndex] || '{}'}
            onChange={(e) => {
                      const newDataGroups = [...inputDataGroups];
                      newDataGroups[groupIndex] = e.target.value;
                      setInputDataGroups(newDataGroups);
                    }}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      isComposingRef.current = true;
                    }}
                    onCompositionEnd={(e) => {
                      const finalValue = (e.target as HTMLTextAreaElement).value;
                      setIsComposing(false);
                      isComposingRef.current = false;
                      const newDataGroups = [...inputDataGroups];
                      newDataGroups[groupIndex] = finalValue;
                      setInputDataGroups(newDataGroups);
            }}
            onBlur={() => {
                      if (isComposingRef.current) return;
              try {
                        const val = JSON.parse(inputDataGroups[groupIndex] || '{}');
                        const newDataGroups = [...inputDataGroups];
                        newDataGroups[groupIndex] = JSON.stringify(val, null, 2);
                        setInputDataGroups(newDataGroups);
                        const currentGroups = shape.inputDataGroups || [];
                        const updatedGroups = [...currentGroups];
                        updatedGroups[groupIndex] = val;
                        updateShape(shape.id, { inputDataGroups: updatedGroups });
              } catch {}
            }}
          />
        )}
                {currentMode === 'api' && (() => {
                  const apiConfig = inputApiConfigs[groupIndex] || { apiMethod: 'GET', apiUrl: '', apiBody: '' };
                  return (
                    <div className={styles.propertyApiConfig}>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>方法</span>
                        <select 
                          className={styles.propertySelectSmall} 
                          value={apiConfig.apiMethod || 'GET'} 
                          onChange={(e) => handleInputApiConfigChange(groupIndex, 'apiMethod', e.target.value as any)}
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="DELETE">DELETE</option>
                        </select>
      </div>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>URL</span>
                        <input 
                          className={styles.propertyInputCompact} 
                          type="text" 
                          value={apiConfig.apiUrl || ''} 
                          onChange={(e) => handleInputApiConfigChange(groupIndex, 'apiUrl', e.target.value)} 
                          placeholder="https://api.example.com"
                          onCompositionStart={() => {
                            setIsComposing(true);
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={(e) => {
                            const finalValue = (e.target as HTMLInputElement).value;
                            setIsComposing(false);
                            isComposingRef.current = false;
                            handleInputApiConfigChange(groupIndex, 'apiUrl', finalValue);
                          }}
                        />
                      </div>
                      {apiConfig.apiMethod !== 'GET' && (
                        <div className={styles.propertyItemCompact}>
                          <span className={styles.propertyLabelCompact}>Body</span>
                          <textarea 
                            className={styles.propertyTextareaCompact} 
                            value={apiConfig.apiBody || ''} 
                            onChange={(e) => handleInputApiConfigChange(groupIndex, 'apiBody', e.target.value)} 
                            placeholder='{"name": "${inputData.name}", "age": "${inputData.age}"}'
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => {
                              const finalValue = (e.target as HTMLTextAreaElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleInputApiConfigChange(groupIndex, 'apiBody', finalValue);
                            }}
                          />
                          <div className={styles.propertyHintCompact}>
                            支持变量: ${'{'}inputData.key{'}'}, ${'{'}outputData.key{'}'}, ${'{'}inputDataGroups[0].key{'}'}
                          </div>
                        </div>
                      )}
                      <div className={styles.propertyApiActions}>
                        <button className={styles.propertyButtonSmall} onClick={() => runInputApi(groupIndex)}>运行</button>
                        {apiConfig.lastRunAt && (
                          <span className={styles.propertyHintCompact}>
                            最近运行: {new Date(apiConfig.lastRunAt).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            );
          })}


        </div>
      )}
      
      {outputPropsTexts && outputPropsTexts.length > 0 && (
      <div className={styles.propertyGroup}>
          <div className={styles.propertyGroupHeader}>
            <h4 className={styles.propertyGroupTitle}>输出</h4>
            <button className={styles.iconButtonSmall} onClick={() => handleAddGroup('outputProps')} title="新增输出组">
              <span className={styles.icon}>＋</span>
            </button>
          </div>
          {outputPropsTexts.map((group, groupIndex) => {
            const currentMode = outputModes[groupIndex] || 'props';
            return (
              <div key={`output-group-${groupIndex}`} className={styles.propertySubGroup}>
                <div className={styles.propertySubGroupHeader}>
                  <span className={styles.propertySubGroupTitle}>输出组 {groupIndex + 1}</span>
                  <div className={styles.propertySubGroupActions}>
                    <select
                      className={styles.propertySelectSmall}
                      value={currentMode}
                      onChange={(e) => handleOutputModeChange(groupIndex, e.target.value as 'props' | 'custom' | 'api')}
                    >
                      <option value="props">属性输出</option>
                      <option value="custom">自定义json输出</option>
                      <option value="api">调用api输出</option>
                    </select>
                    {outputPropsTexts.length > 1 && (
                      <button className={styles.iconButtonSmall} onClick={() => handleRemoveGroup('outputProps', groupIndex)} title="删除组">
                        <span className={styles.icon}>×</span>
                      </button>
                    )}
                  </div>
                </div>
                {currentMode === 'props' && (
                  <>
          <div className={styles.propertyList}>
                      {group.map((_, propIndex) => (
                        <div key={`output-${groupIndex}-${propIndex}`} className={styles.propertyItemCompact}>
              <input
                            type="text" 
                            value={group[propIndex] ?? ''}
                            onChange={(e) => handleInputChange('outputProps', groupIndex, propIndex, e.target.value)}
                            className={styles.propertyInputCompact}
                            placeholder="属性名"
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => { 
                              const finalValue = (e.target as HTMLInputElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleInputChange('outputProps', groupIndex, propIndex, finalValue);
                            }}
                            onBlur={(e) => handleInputChange('outputProps', groupIndex, propIndex, e.target.value)}
                          />
                          <button className={styles.iconButtonSmall} onClick={() => handleRemoveProp('outputProps', groupIndex, propIndex)} title="删除">
                            <span className={styles.icon}>×</span>
                          </button>
          </div>
                      ))}
        </div>
                    <button className={styles.iconButtonSmall} onClick={() => handleAddProp('outputProps', groupIndex)} title="新增属性">
                      <span className={styles.icon}>＋</span>
                    </button>
                  </>
                )}
                {currentMode === 'custom' && (
          <textarea
                    className={styles.propertyTextareaCompact}
            placeholder="运行结果或手动设定的输出"
            value={outputDataText}
            onChange={(e) => {
              setOutputDataText(e.target.value);
            }}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      isComposingRef.current = true;
                    }}
                    onCompositionEnd={(e) => {
                      const finalValue = (e.target as HTMLTextAreaElement).value;
                      setIsComposing(false);
                      isComposingRef.current = false;
                      setOutputDataText(finalValue);
                    }}
            onBlur={() => {
                      if (isComposingRef.current) return;
              try {
                const val = JSON.parse(outputDataText || '{}');
                updateShape(shape.id, { outputData: val });
              } catch {}
            }}
          />
        )}
                {currentMode === 'api' && (() => {
                  const apiConfig = outputApiConfigs[groupIndex] || { apiMethod: 'GET', apiUrl: '', apiBody: '' };
                  return (
                    <div className={styles.propertyApiConfig}>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>方法</span>
                        <select 
                          className={styles.propertySelectSmall} 
                          value={apiConfig.apiMethod || 'GET'} 
                          onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiMethod', e.target.value as any)}
                        >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>URL</span>
                        <input 
                          className={styles.propertyInputCompact} 
                          type="text" 
                          value={apiConfig.apiUrl || ''} 
                          onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiUrl', e.target.value)} 
                          placeholder="https://api.example.com"
                          onCompositionStart={() => {
                            setIsComposing(true);
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={(e) => {
                            const finalValue = (e.target as HTMLInputElement).value;
                            setIsComposing(false);
                            isComposingRef.current = false;
                            handleOutputApiConfigChange(groupIndex, 'apiUrl', finalValue);
                          }}
                        />
            </div>
                      {apiConfig.apiMethod !== 'GET' && (
                        <div className={styles.propertyItemCompact}>
                          <span className={styles.propertyLabelCompact}>Body</span>
                          <textarea 
                            className={styles.propertyTextareaCompact} 
                            value={apiConfig.apiBody || ''} 
                            onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiBody', e.target.value)} 
                            placeholder='{"name": "${outputData.name}", "age": "${outputData.age}"}'
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => {
                              const finalValue = (e.target as HTMLTextAreaElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleOutputApiConfigChange(groupIndex, 'apiBody', finalValue);
                            }}
                          />
                          <div className={styles.propertyHintCompact}>
                            支持变量: ${'{'}inputData.key{'}'}, ${'{'}outputData.key{'}'}, ${'{'}outputDataGroups[0].key{'}'}
                          </div>
              </div>
            )}
                      <div className={styles.propertyApiActions}>
                        <button className={styles.propertyButtonSmall} onClick={() => runOutputApi(groupIndex)}>运行</button>
                        {apiConfig.lastRunAt && (
                          <span className={styles.propertyHintCompact}>
                            最近运行: {new Date(apiConfig.lastRunAt).toLocaleString()}
                          </span>
                        )}
            </div>
            </div>
                  );
                })()}
              </div>
            );
          })}
          </div>
        )}

    </div>
  );

  const renderContainerProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>容器名称</h4>
        <input
          type="text"
          value={titleText}
          placeholder="容器名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
          onCompositionStart={() => {
            setIsComposing(true);
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => { 
            const finalValue = (e.target as HTMLInputElement).value;
            setTitleText(finalValue); // 先更新本地状态为最终值
            setIsComposing(false);
            isComposingRef.current = false;
            updateShape(shape.id, { title: finalValue }); // 再更新全局状态
          }}
        />
      </div>
      {/* ID 为内部使用，不对用户开放编辑与显示 */}
    </div>
  );

  const renderArrowProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>连接信息</h4>
        <div className={styles.propertyList}>
          <div className={styles.propertyItem}>
            <span className={styles.propertyLabel}>源节点:</span>
            <span className={styles.propertyValue}>{shape.sourceNode || '未连接'}</span>
          </div>
          <div className={styles.propertyItem}>
            <span className={styles.propertyLabel}>目标节点:</span>
            <span className={styles.propertyValue}>{shape.targetNode || '未连接'}</span>
          </div>
          <div className={styles.propertyItem}>
            <span className={styles.propertyLabel}>序号:</span>
            <input
              type="number"
              min={1}
              step={1}
              className={styles.propertyInput}
              value={shape.order ?? ''}
              placeholder="可选，数值越小越先运行"
              onChange={(e) => {
                const raw = e.target.value;
                const num = raw === '' ? undefined : Number.parseInt(raw, 10);
                if (Number.isNaN(num as number)) {
                  updateShape(shape.id, { order: undefined });
                } else {
                  updateShape(shape.id, { order: num });
                }
                forceRerender((x) => x + 1);
              }}
            />
          </div>
          <div className={styles.propertyItem}>
            <span className={styles.propertyLabel}>用途:</span>
            <input
              type="text"
              className={styles.propertyInput}
              value={arrowNoteText}
              placeholder="例如：用户信息传递"
              onChange={(e) => {
                const val = e.target.value;
                setArrowNoteText(val);
                // 合成期间不更新全局，避免打断输入法（使用 ref 获取最新值）
                if (!isComposingRef.current) {
                  updateShape(shape.id, { note: val } as any);
                }
              }}
              onCompositionStart={() => { 
                setIsComposing(true); 
                isComposingRef.current = true; 
              }}
              onCompositionEnd={(e) => {
                const finalValue = (e.target as HTMLInputElement).value;
                setArrowNoteText(finalValue); // 先更新本地状态为最终值
                isComposingRef.current = false;
                setIsComposing(false);
                updateShape(shape.id, { note: finalValue } as any); // 再更新全局状态
              }}
              onBlur={() => {
                if (!isComposingRef.current) updateShape(shape.id, { note: arrowNoteText } as any);
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );

  const renderStartProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>名称</h4>
        <input
          type="text"
          value={titleText}
          placeholder="起点名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
          onCompositionStart={() => {
            setIsComposing(true);
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => { 
            const finalValue = (e.target as HTMLInputElement).value;
            setTitleText(finalValue); // 先更新本地状态为最终值
            setIsComposing(false);
            isComposingRef.current = false;
            updateShape(shape.id, { title: finalValue }); // 再更新全局状态
          }}
        />
      </div>

        <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>描述</h4>
        <textarea
          className={styles.propertyTextarea}
          placeholder="起点描述（将显示在画布上）"
          value={descriptionText}
          onChange={(e) => { setDescriptionText(e.target.value); if (!isComposingRef.current) updateShape(shape.id, { description: e.target.value }); }}
          onCompositionStart={() => {
            setIsComposing(true);
            isComposingRef.current = true;
          }}
          onCompositionEnd={(e) => { 
            const finalValue = (e.target as HTMLTextAreaElement).value;
            setDescriptionText(finalValue); // 先更新本地状态为最终值
            setIsComposing(false);
            isComposingRef.current = false;
            updateShape(shape.id, { description: finalValue }); // 再更新全局状态
          }}
          onBlur={() => { if (!isComposingRef.current) updateShape(shape.id, { description: descriptionText }); }}
        />
      </div>

      {outputPropsTexts && outputPropsTexts.length > 0 && (
        <div className={styles.propertyGroup}>
          <div className={styles.propertyGroupHeader}>
            <h4 className={styles.propertyGroupTitle}>输出</h4>
            <button className={styles.iconButtonSmall} onClick={() => handleAddGroup('outputProps')} title="新增输出组">
              <span className={styles.icon}>＋</span>
            </button>
          </div>
          {outputPropsTexts.map((group, groupIndex) => {
            const currentMode = outputModes[groupIndex] || 'props';
            return (
              <div key={`output-group-${groupIndex}`} className={styles.propertySubGroup}>
                <div className={styles.propertySubGroupHeader}>
                  <span className={styles.propertySubGroupTitle}>输出组 {groupIndex + 1}</span>
                  <div className={styles.propertySubGroupActions}>
                    <select
                      className={styles.propertySelectSmall}
                      value={currentMode}
                      onChange={(e) => handleOutputModeChange(groupIndex, e.target.value as 'props' | 'custom' | 'api')}
                    >
                      <option value="props">属性输出</option>
                      <option value="custom">自定义json输出</option>
                      <option value="api">调用api输出</option>
                    </select>
                    {outputPropsTexts.length > 1 && (
                      <button className={styles.iconButtonSmall} onClick={() => handleRemoveGroup('outputProps', groupIndex)} title="删除组">
                        <span className={styles.icon}>×</span>
                      </button>
                    )}
                  </div>
                </div>
                {currentMode === 'props' && (
                  <>
          <div className={styles.propertyList}>
                      {group.map((_, propIndex) => (
                        <div key={`output-${groupIndex}-${propIndex}`} className={styles.propertyItemCompact}>
                <input 
                  type="text" 
                            value={group[propIndex] ?? ''}
                            onChange={(e) => handleInputChange('outputProps', groupIndex, propIndex, e.target.value)}
                            className={styles.propertyInputCompact}
                  placeholder="属性名"
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => { 
                              const finalValue = (e.target as HTMLInputElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleInputChange('outputProps', groupIndex, propIndex, finalValue);
                            }}
                            onBlur={(e) => handleInputChange('outputProps', groupIndex, propIndex, e.target.value)}
                />
                          <button className={styles.iconButtonSmall} onClick={() => handleRemoveProp('outputProps', groupIndex, propIndex)} title="删除">
                  <span className={styles.icon}>×</span>
                </button>
              </div>
            ))}
          </div>
                    <button className={styles.iconButtonSmall} onClick={() => handleAddProp('outputProps', groupIndex)} title="新增属性">
            <span className={styles.icon}>＋</span>
          </button>
                  </>
      )}
                {currentMode === 'custom' && (
          <textarea
                    className={styles.propertyTextareaCompact}
            placeholder="运行结果或手动设定的输出"
            value={outputDataText}
            onChange={(e) => {
              setOutputDataText(e.target.value);
            }}
                    onCompositionStart={() => {
                      setIsComposing(true);
                      isComposingRef.current = true;
                    }}
                    onCompositionEnd={(e) => {
                      const finalValue = (e.target as HTMLTextAreaElement).value;
                      setIsComposing(false);
                      isComposingRef.current = false;
                      setOutputDataText(finalValue);
                    }}
            onBlur={() => {
                      if (isComposingRef.current) return;
              try {
                const val = JSON.parse(outputDataText || '{}');
                updateShape(shape.id, { outputData: val });
              } catch {}
            }}
          />
        )}
                {currentMode === 'api' && (() => {
                  const apiConfig = outputApiConfigs[groupIndex] || { apiMethod: 'GET', apiUrl: '', apiBody: '' };
                  return (
                    <div className={styles.propertyApiConfig}>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>方法</span>
                        <select 
                          className={styles.propertySelectSmall} 
                          value={apiConfig.apiMethod || 'GET'} 
                          onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiMethod', e.target.value as any)}
                        >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
                      <div className={styles.propertyItemCompact}>
                        <span className={styles.propertyLabelCompact}>URL</span>
                        <input 
                          className={styles.propertyInputCompact} 
                          type="text" 
                          value={apiConfig.apiUrl || ''} 
                          onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiUrl', e.target.value)} 
                          placeholder="https://api.example.com"
                          onCompositionStart={() => {
                            setIsComposing(true);
                            isComposingRef.current = true;
                          }}
                          onCompositionEnd={(e) => {
                            const finalValue = (e.target as HTMLInputElement).value;
                            setIsComposing(false);
                            isComposingRef.current = false;
                            handleOutputApiConfigChange(groupIndex, 'apiUrl', finalValue);
                          }}
                        />
            </div>
                      {apiConfig.apiMethod !== 'GET' && (
                        <div className={styles.propertyItemCompact}>
                          <span className={styles.propertyLabelCompact}>Body</span>
                          <textarea 
                            className={styles.propertyTextareaCompact} 
                            value={apiConfig.apiBody || ''} 
                            onChange={(e) => handleOutputApiConfigChange(groupIndex, 'apiBody', e.target.value)} 
                            placeholder='{"name": "${outputData.name}", "age": "${outputData.age}"}'
                            onCompositionStart={() => {
                              setIsComposing(true);
                              isComposingRef.current = true;
                            }}
                            onCompositionEnd={(e) => {
                              const finalValue = (e.target as HTMLTextAreaElement).value;
                              setIsComposing(false);
                              isComposingRef.current = false;
                              handleOutputApiConfigChange(groupIndex, 'apiBody', finalValue);
                            }}
                          />
                          <div className={styles.propertyHintCompact}>
                            支持变量: ${'{'}inputData.key{'}'}, ${'{'}outputData.key{'}'}, ${'{'}outputDataGroups[0].key{'}'}
                          </div>
              </div>
            )}
                      <div className={styles.propertyApiActions}>
                        <button className={styles.propertyButtonSmall} onClick={() => runOutputApi(groupIndex)}>运行</button>
                        {apiConfig.lastRunAt && (
                          <span className={styles.propertyHintCompact}>
                            最近运行: {new Date(apiConfig.lastRunAt).toLocaleString()}
                          </span>
                        )}
            </div>
            </div>
                  );
                })()}
              </div>
            );
          })}
          </div>
        )}
    </div>
  );

  return (
    <div className={`${styles.propertyPanel} ${animateClass}`}>
      <div className={styles.propertyHeader}>
        <h2 className={styles.propertyPanelTitle}>属性</h2>
        <button
          className={styles.headerDeleteButton}
          onClick={() => {
            deleteShape(shape.id);
          }}
          title="删除组件"
        >
          删除
        </button>
      </div>
      
      <div className={styles.propertyContent}>
        {shape.type === 'node' && renderNodeProperties()}
        {shape.type === 'start' && renderStartProperties()}
        {shape.type === 'container' && renderContainerProperties()}
        {shape.type === 'arrow' && renderArrowProperties()}
      </div>
    </div>
  );
};

export default PropertyPanel;
