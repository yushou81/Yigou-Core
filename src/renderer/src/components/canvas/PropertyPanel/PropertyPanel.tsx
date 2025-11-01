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

  useEffect(() => {
    setInputDataText(shape.inputData ? JSON.stringify(shape.inputData, null, 2) : '');
    setOutputDataText(shape.outputData ? JSON.stringify(shape.outputData, null, 2) : '');
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
                <span className={styles.propertyLabel}>{`输入${index+1}`}:</span>
                <input 
                  type="text" 
                  value={prop}
                  onChange={(e) => handleInputChange('inputProps', index, e.target.value)}
                  className={styles.propertyInput}
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
