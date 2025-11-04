import React, { useEffect, useRef, useState } from 'react';
import { ShapeData } from '../../../types/canvas';
import styles from './PropertyPanel.module.css';
import { useCanvas } from '../../../hooks/useCanvas';

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

  useEffect(() => {
    setInputDataText(shape.inputData ? JSON.stringify(shape.inputData, null, 2) : '');
    setOutputDataText(shape.outputData ? JSON.stringify(shape.outputData, null, 2) : '');
    // 当选中目标变化时，同步箭头用途的本地值
    if (shape.type === 'arrow') {
      setArrowNoteText((shape as any).note || '');
    }
  }, [shape.id, shape.inputData, shape.outputData]);

  const handleInputChange = (path: 'inputProps' | 'outputProps', index: number, value: string) => {
    if (!shape) return;
    let next: string[] = [];
    if (path === 'inputProps') {
      next = [...(shape.inputProps || [])];
      next[index] = value;
      updateShape(shape.id, { inputProps: next });
    } else {
      next = [...(shape.outputProps || [])];
      next[index] = value;
      updateShape(shape.id, { outputProps: next });
    }
    forceRerender(x => x + 1);
  };

  const handleAddProp = (path: 'inputProps' | 'outputProps') => {
    if (!shape) return;
    const list = [...(shape[path] || [])];
    list.push('');
    updateShape(shape.id, { [path]: list });
    forceRerender(x => x + 1);
  };

  const handleRemoveProp = (path: 'inputProps' | 'outputProps', index: number) => {
    if (!shape) return;
    const list = [...(shape[path] || [])];
    list.splice(index, 1);
    updateShape(shape.id, { [path]: list });
    forceRerender(x => x + 1);
  };

  const handleNodeTitleChange = (value: string) => {
    if (!shape) return;
    updateShape(shape.id, { title: value });
    forceRerender(x => x + 1);
  };

  // 保留占位：如需逐字段编辑可扩展

  const handleApiToggle = (enabled: boolean) => {
    shape.apiEnabled = enabled;
    forceRerender(x => x + 1);
  };

  const handleApiConfigChange = (key: 'apiUrl' | 'apiMethod' | 'apiBody' | 'apiUseAsOutput', value: any) => {
    (shape as any)[key] = value;
    forceRerender(x => x + 1);
  };

  // 解析 API 返回结果（与验证逻辑一致）
  const parseApiResult = (apiResult: any): Record<string, any> => {
    if (!apiResult) return {};
    if (typeof apiResult === 'object' && !Array.isArray(apiResult)) {
      return apiResult;
    }
    if (Array.isArray(apiResult)) {
      return apiResult.length > 0 ? { ...apiResult[0], _array: apiResult } : {};
    }
    if (typeof apiResult === 'string') {
      try {
        const parsed = JSON.parse(apiResult);
        return parseApiResult(parsed);
      } catch {
        return { value: apiResult };
      }
    }
    return { value: apiResult };
  };

  // 获取输入数据（与验证逻辑一致）
  const getInputData = (): Record<string, any> => {
    const mode = shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props');
    if (mode === 'props') {
      const props = (shape.inputProps || []).filter((k: string) => !!k);
      const inputData: Record<string, any> = {};
      props.forEach((prop: string) => {
        if (shape.inputData && shape.inputData[prop] !== undefined) {
          inputData[prop] = shape.inputData[prop];
        }
      });
      return inputData;
    }
    return shape.inputData && typeof shape.inputData === 'object' && !Array.isArray(shape.inputData) ? shape.inputData : {};
  };

  // 获取输出数据（与验证逻辑一致）
  const getOutputData = (): Record<string, any> => {
    const mode = shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'));
    if (mode === 'props') {
      const props = (shape.outputProps || []).filter((k: string) => !!k);
      const outputData: Record<string, any> = {};
      props.forEach((prop: string) => {
        if (shape.outputData && shape.outputData[prop] !== undefined) {
          outputData[prop] = shape.outputData[prop];
        }
      });
      return outputData;
    }
    if (mode === 'api') {
      const apiResult = shape.outputData?.apiResult;
      if (apiResult) {
        return parseApiResult(apiResult);
      }
      return {};
    }
    return shape.outputData && typeof shape.outputData === 'object' && !Array.isArray(shape.outputData) ? shape.outputData : {};
  };

  // 格式化值的显示
  const formatValue = (value: any): string => {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value);
      } catch {
        return '[Object]';
      }
    }
    return String(value);
  };

  // 从数据对象中提取属性名
  const extractProperties = (data: any): string[] => {
    if (!data) return [];
    // 如果是对象，提取所有键
    if (typeof data === 'object' && !Array.isArray(data)) {
      return Object.keys(data).filter(k => k !== '_array'); // 排除内部数组标记
    }
    // 如果是数组，提取第一个元素的键
    if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
      return Object.keys(data[0]);
    }
    return [];
  };

  const runApi = async () => {
    if (!shape || !shape.apiEnabled || !shape.apiUrl) return;
    try {
      const method = shape.apiMethod || 'GET';
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      const init: RequestInit = { method, headers };
      if (method !== 'GET' && shape.apiBody) {
        init.body = shape.apiBody;
      }
      const res = await fetch(shape.apiUrl, init);
      const text = await res.text();
      let data: any = text;
      try { data = JSON.parse(text); } catch {}
      shape.lastRunAt = Date.now();
      if (shape.apiUseAsOutput) {
        shape.outputData = { ...(shape.outputData || {}), apiResult: data };
        
        // 如果使用 API 作为输出，并且是 props 模式，自动提取属性名
        const outputMode = shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'));
        if (outputMode === 'props' || outputMode === 'api') {
          const parsedData = parseApiResult(data);
          const properties = extractProperties(parsedData);
          if (properties.length > 0) {
            // 提取属性名并更新 outputProps（只添加新的属性，保留已有的）
            const existingProps = (shape.outputProps || []).filter(p => !!p);
            const newProps = [...new Set([...existingProps, ...properties])]; // 去重合并
            updateShape(shape.id, { outputProps: newProps });
          }
        }
      }
    } catch (e) {
      shape.outputData = { ...(shape.outputData || {}), apiError: String(e) };
    }
    forceRerender(x => x + 1);
  };

  const renderNodeProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>名称</h4>
        <input
          type="text"
          value={shape.title || ''}
          placeholder="节点名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
        />
      </div>

      {(shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props')) === 'props' && shape.inputProps && shape.inputProps.length > 0 && (
        <div className={styles.propertyGroup}>
          <h4 className={styles.propertyGroupTitle}>输入属性</h4>
          <div className={styles.propertyList}>
            {shape.inputProps.map((prop, index) => (
              <div key={`input-${index}`} className={styles.propertyItem}>
                <span className={styles.propertyLabel}>{`输入${index+1}:`}</span>
                <input 
                  type="text" 
                  value={prop}
                  onChange={(e) => handleInputChange('inputProps', index, e.target.value)}
                  className={styles.propertyInput}
                  placeholder="属性名"
                />
                <button className={styles.iconButton} onClick={() => handleRemoveProp('inputProps', index)} title="删除">
                  <span className={styles.icon}>×</span>
                </button>
              </div>
            ))}
          </div>
          <button className={styles.iconButton} onClick={() => handleAddProp('inputProps')} title="新增输入">
            <span className={styles.icon}>＋</span>
          </button>
        </div>
      )}
      
      {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'props' && shape.outputProps && shape.outputProps.length > 0 && (
        <div className={styles.propertyGroup}>
          <h4 className={styles.propertyGroupTitle}>输出属性</h4>
          <div className={styles.propertyList}>
            {shape.outputProps.map((prop, index) => (
              <div key={`output-${index}`} className={styles.propertyItem}>
                <span className={styles.propertyLabel}>{`输出${index+1}`}:</span>
                <input 
                  type="text" 
                  value={prop}
                  onChange={(e) => handleInputChange('outputProps', index, e.target.value)}
                  className={styles.propertyInput}
                />
                <button className={styles.iconButton} onClick={() => handleRemoveProp('outputProps', index)} title="删除">
                  <span className={styles.icon}>×</span>
                </button>
              </div>
            ))}
          </div>
          <button className={styles.iconButton} onClick={() => handleAddProp('outputProps')} title="新增输出">
            <span className={styles.icon}>＋</span>
          </button>
        </div>
      )}

      <div className={styles.propertyGroup}>
        <div className={styles.propertyItem}>
          <label>
            <input
              type="checkbox"
              checked={(shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props')) === 'custom'}
              onChange={(e) => {
                const enable = e.target.checked;
                updateShape(shape.id, { inputDataEnabled: enable, inputMode: enable ? 'custom' : 'props' });
                forceRerender(x => x + 1);
              }}
            /> 自定义输入数据
          </label>
        </div>
        {(shape.inputMode || (shape.inputDataEnabled ? 'custom' : 'props')) === 'custom' && (
          <textarea
            className={styles.propertyTextarea}
            placeholder={`{\n  "key": "value"\n}`}
            value={inputDataText}
            onChange={(e) => {
              setInputDataText(e.target.value);
            }}
            onBlur={() => {
              try {
                const val = JSON.parse(inputDataText || '{}');
                updateShape(shape.id, { inputData: val });
              } catch {}
            }}
          />
        )}
      </div>

      <div className={styles.propertyGroup}>
        <div className={styles.propertyItem}>
          <div className={styles.propertyList}>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'props'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'props', outputDataEnabled: false, apiUseAsOutput: false });
                  forceRerender(x => x + 1);
                }}
              /> 使用输出属性
            </label>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'custom'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'custom', outputDataEnabled: true, apiUseAsOutput: false });
                  forceRerender(x => x + 1);
                }}
              /> 自定义输出
            </label>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'api'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'api', outputDataEnabled: false, apiUseAsOutput: true });
                  forceRerender(x => x + 1);
                }}
              /> 使用 API 输出
            </label>
          </div>
        </div>
        {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'custom' && (
          <textarea
            className={styles.propertyTextarea}
            placeholder="运行结果或手动设定的输出"
            value={outputDataText}
            onChange={(e) => {
              setOutputDataText(e.target.value);
            }}
            onBlur={() => {
              try {
                const val = JSON.parse(outputDataText || '{}');
                updateShape(shape.id, { outputData: val });
              } catch {}
            }}
          />
        )}
        {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'api' && (
          <div className={styles.propertyHint}>将使用最近一次 API 运行结果作为输出（在“调用 API”中运行）。</div>
        )}
      </div>

      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>调用 API</h4>
        <div className={styles.propertyItem}>
          <label>
            <input type="checkbox" checked={!!shape.apiEnabled} onChange={(e) => handleApiToggle(e.target.checked)} /> 启用 API
          </label>
        </div>
        {shape.apiEnabled && (
          <div className={styles.propertyList}>
            <div className={styles.propertyItem}>
              <span className={styles.propertyLabel}>方法</span>
              <select className={styles.propertySelect} value={shape.apiMethod || 'GET'} onChange={(e) => handleApiConfigChange('apiMethod', e.target.value as any)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className={styles.propertyItem}>
              <span className={styles.propertyLabel}>URL</span>
              <input className={styles.propertyInput} type="text" value={shape.apiUrl || ''} onChange={(e) => handleApiConfigChange('apiUrl', e.target.value)} placeholder="https://api.example.com" />
            </div>
            {shape.apiMethod !== 'GET' && (
              <div className={styles.propertyItem}>
                <span className={styles.propertyLabel}>Body</span>
                <textarea className={styles.propertyTextarea} value={shape.apiBody || ''} onChange={(e) => handleApiConfigChange('apiBody', e.target.value)} placeholder={`{"key":"value"}`} />
              </div>
            )}
            <div className={styles.propertyItem}>
              <label>
                <input type="checkbox" checked={!!shape.apiUseAsOutput} onChange={(e) => handleApiConfigChange('apiUseAsOutput', e.target.checked)} /> 根据调用 API 作为输出
              </label>
            </div>
            <div className={styles.propertyActions}>
              <button className={styles.propertyButton} onClick={runApi}>运行</button>
              {shape.lastRunAt && <span className={styles.propertyHint}>最近运行: {new Date(shape.lastRunAt).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderContainerProperties = () => (
    <div className={styles.propertySection}>
      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>容器名称</h4>
        <input
          type="text"
          value={shape.title || ''}
          placeholder="容器名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
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
                // 实时更新：仅在非合成态时提交，避免打断中文输入法
                if (!isComposing) {
                  updateShape(shape.id, { note: val } as any);
                }
              }}
              onCompositionStart={() => setIsComposing(true)}
              onCompositionEnd={(e) => {
                setIsComposing(false);
                const val = (e.target as HTMLInputElement).value;
                setArrowNoteText(val);
                // 合成结束后提交一次，确保中文输入结果保存
                updateShape(shape.id, { note: val } as any);
              }}
              onBlur={() => {
                if (!isComposing) updateShape(shape.id, { note: arrowNoteText } as any);
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
          value={shape.title || ''}
          placeholder="起点名称"
          className={styles.propertyInput}
          onChange={(e) => handleNodeTitleChange(e.target.value)}
        />
      </div>

      {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'props' && shape.outputProps && shape.outputProps.length > 0 && (
        <div className={styles.propertyGroup}>
          <h4 className={styles.propertyGroupTitle}>输出属性</h4>
          <div className={styles.propertyList}>
            {shape.outputProps.map((prop, index) => (
              <div key={`output-${index}`} className={styles.propertyItem}>
                <span className={styles.propertyLabel}>{`输出${index+1}:`}</span>
                <input 
                  type="text" 
                  value={prop}
                  onChange={(e) => handleInputChange('outputProps', index, e.target.value)}
                  className={styles.propertyInput}
                  placeholder="属性名"
                />
                <button className={styles.iconButton} onClick={() => handleRemoveProp('outputProps', index)} title="删除">
                  <span className={styles.icon}>×</span>
                </button>
              </div>
            ))}
          </div>
          <button className={styles.iconButton} onClick={() => handleAddProp('outputProps')} title="新增输出">
            <span className={styles.icon}>＋</span>
          </button>
        </div>
      )}

      <div className={styles.propertyGroup}>
        <div className={styles.propertyItem}>
          <div className={styles.propertyList}>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'props'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'props', outputDataEnabled: false, apiUseAsOutput: false });
                  forceRerender(x => x + 1);
                }}
              /> 使用输出属性
            </label>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'custom'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'custom', outputDataEnabled: true, apiUseAsOutput: false });
                  forceRerender(x => x + 1);
                }}
              /> 自定义输出
            </label>
            <label className={styles.propertyItem}>
              <input
                type="radio"
                name="outputMode"
                checked={(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'api'}
                onChange={() => {
                  updateShape(shape.id, { outputMode: 'api', outputDataEnabled: false, apiUseAsOutput: true });
                  forceRerender(x => x + 1);
                }}
              /> 使用 API 输出
            </label>
          </div>
        </div>
        {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'custom' && (
          <textarea
            className={styles.propertyTextarea}
            placeholder="运行结果或手动设定的输出"
            value={outputDataText}
            onChange={(e) => {
              setOutputDataText(e.target.value);
            }}
            onBlur={() => {
              try {
                const val = JSON.parse(outputDataText || '{}');
                updateShape(shape.id, { outputData: val });
              } catch {}
            }}
          />
        )}
        {(shape.outputMode || (shape.outputDataEnabled ? 'custom' : (shape.apiUseAsOutput ? 'api' : 'props'))) === 'api' && (
          <div className={styles.propertyHint}>将使用最近一次 API 运行结果作为输出（在“调用 API”中运行）。</div>
        )}
      </div>

      <div className={styles.propertyGroup}>
        <h4 className={styles.propertyGroupTitle}>调用 API</h4>
        <div className={styles.propertyItem}>
          <label>
            <input type="checkbox" checked={!!shape.apiEnabled} onChange={(e) => handleApiToggle(e.target.checked)} /> 启用 API
          </label>
        </div>
        {shape.apiEnabled && (
          <div className={styles.propertyList}>
            <div className={styles.propertyItem}>
              <span className={styles.propertyLabel}>方法</span>
              <select className={styles.propertySelect} value={shape.apiMethod || 'GET'} onChange={(e) => handleApiConfigChange('apiMethod', e.target.value as any)}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>
            <div className={styles.propertyItem}>
              <span className={styles.propertyLabel}>URL</span>
              <input className={styles.propertyInput} type="text" value={shape.apiUrl || ''} onChange={(e) => handleApiConfigChange('apiUrl', e.target.value)} placeholder="https://api.example.com" />
            </div>
            {shape.apiMethod !== 'GET' && (
              <div className={styles.propertyItem}>
                <span className={styles.propertyLabel}>Body</span>
                <textarea className={styles.propertyTextarea} value={shape.apiBody || ''} onChange={(e) => handleApiConfigChange('apiBody', e.target.value)} placeholder={`{"key":"value"}`} />
              </div>
            )}
            <div className={styles.propertyItem}>
              <label>
                <input type="checkbox" checked={!!shape.apiUseAsOutput} onChange={(e) => handleApiConfigChange('apiUseAsOutput', e.target.checked)} /> 根据调用 API 作为输出
              </label>
            </div>
            <div className={styles.propertyActions}>
              <button className={styles.propertyButton} onClick={runApi}>运行</button>
              {shape.lastRunAt && <span className={styles.propertyHint}>最近运行: {new Date(shape.lastRunAt).toLocaleString()}</span>}
            </div>
          </div>
        )}
      </div>
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
