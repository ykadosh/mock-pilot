import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { CanvasPreviewHandle } from "../../components/CanvasPreview";
import type { CodeEditorHandle } from "../../components/CodeEditor";
import { useConversation } from "../../hooks/useConversation";
import { useHistory } from "../../hooks/useHistory";
import { getAssetsBasePath, getCapturedHtml } from "../../lib/store";
import type { SelectedElement } from "./Editor";
import { DEVICE_SIZES, getEditorRoute, isEditorTool, isInformationalTool, type DevicePreset, type EditorTool } from "./Editor.utils";

type EditorHistory = ReturnType<typeof useHistory>;

type PendingLabelRef = React.RefObject<string>;

function useProjectAssets(projectId?: string) {
  const [assetsBasePath, setAssetsBasePath] = useState<string | null>(getAssetsBasePath());

  useEffect(() => {
    if (assetsBasePath || !projectId) return;
    window.api.loadProject(projectId).then((result) => {
      if (result.success && result.assetsBasePath) setAssetsBasePath(result.assetsBasePath);
    });
  }, [assetsBasePath, projectId]);

  return assetsBasePath;
}

function useHistoryInitialization(history: EditorHistory) {
  const { entries, initialize, loaded } = history;

  useEffect(() => {
    if (!loaded || entries.length > 0) return;
    const html = getCapturedHtml();
    if (html) initialize(html);
  }, [entries.length, initialize, loaded]);
}

function useHistoryMessageSync(history: EditorHistory, pendingLabelRef: PendingLabelRef, projectId?: string) {
  const { push } = history;

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type !== "modification-applied" || !event.data.success || !event.data.fullHTML) return;
      const fullDoc = `<!DOCTYPE html><html>${event.data.fullHTML}</html>`;
      const label = event.data.label || pendingLabelRef.current || "AI modification";
      push(fullDoc, label);
      pendingLabelRef.current = "AI modification";
      if (projectId) window.api.updateProjectHtml(projectId, fullDoc);
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [pendingLabelRef, projectId, push]);
}

function useHistoryPersistence(history: EditorHistory, projectId?: string) {
  const { currentHtml, pointer } = history;

  useEffect(() => {
    if (!projectId || !currentHtml || pointer <= 0) return;
    window.api.updateProjectHtml(projectId, currentHtml);
  }, [currentHtml, pointer, projectId]);
}

function useEditorToolState() {
  const [activeTool, setActiveTool] = useState<EditorTool | null>(null);
  const [selectedElement, setSelectedElement] = useState<SelectedElement | null>(null);

  const handleToolClick = useCallback((tool: string) => {
    if (!isEditorTool(tool)) return;
    setActiveTool((current) => (current === tool ? null : tool));
    if (!isInformationalTool(tool)) {
      setSelectedElement(null);
    }
  }, []);

  const handleElementSelected = useCallback((element: SelectedElement) => {
    setSelectedElement(element);
    setActiveTool(null);
  }, []);

  const handleSelectionClear = useCallback(() => {
    setSelectedElement(null);
    setActiveTool((current) => (current === "Element Picker" ? null : current));
  }, []);

  const openChat = useCallback(() => setActiveTool("Chat"), []);

  return { activeTool, handleElementSelected, handleSelectionClear, handleToolClick, openChat, selectedElement, setActiveTool, setSelectedElement };
}

function useEditorViewportState(codeEditorDefault: boolean) {
  const [codeTab, setCodeTab] = useState<"html" | "css">("html");
  const [codeDirty, setCodeDirty] = useState(false);
  const [device, setDevice] = useState<DevicePreset>("laptop");
  const [zoom, setZoom] = useState(100);

  const zoomIn = useCallback(() => setZoom((value) => Math.min(value + 25, 200)), []);
  const zoomOut = useCallback(() => setZoom((value) => Math.max(value - 25, 25)), []);

  return { codeDirty, codeEditorOpen: codeEditorDefault, codeTab, device, setCodeDirty, setCodeTab, setDevice, zoom, zoomIn, zoomOut };
}

interface EditorModificationsArgs {
  canvasRef: React.RefObject<CanvasPreviewHandle | null>;
  pendingLabelRef: PendingLabelRef;
  history: EditorHistory;
  tools: ReturnType<typeof useEditorToolState>;
  projectId?: string;
}

function useEditorModifications({ canvasRef, pendingLabelRef, history, tools, projectId }: EditorModificationsArgs) {
  const handleApplyModification = useCallback((mpId: string, newHTML: string, label?: string) => {
    pendingLabelRef.current = label || "AI modification";
    canvasRef.current?.applyModification(mpId, newHTML, label);
    if (newHTML === "__REMOVE_ELEMENT__") tools.setSelectedElement(null);
  }, [canvasRef, pendingLabelRef, tools]);

  const handleApplyPageModification = useCallback((newHTML: string, label?: string) => {
    history.push(newHTML, label || "AI page modification");
    if (projectId) window.api.updateProjectHtml(projectId, newHTML);
  }, [history, projectId]);

  return { handleApplyModification, handleApplyPageModification };
}

export function useEditorState(codeEditorDefault = false) {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const assetsBasePath = useProjectAssets(projectId);
  const canvasRef = useRef<CanvasPreviewHandle>(null), codeEditorRef = useRef<CodeEditorHandle>(null), pendingLabelRef = useRef("AI modification");
  const history = useHistory(projectId), tools = useEditorToolState(), viewport = useEditorViewportState(codeEditorDefault);
  const conversation = useConversation(projectId);

  useHistoryInitialization(history);
  useHistoryMessageSync(history, pendingLabelRef, projectId);
  useHistoryPersistence(history, projectId);

  const { handleApplyModification, handleApplyPageModification } = useEditorModifications({ canvasRef, pendingLabelRef, history, tools, projectId });

  const handleCodeUpdate = useCallback((fullHtml: string, label: string) => {
    history.push(fullHtml, label);
    if (projectId) window.api.updateProjectHtml(projectId, fullHtml);
    navigate(getEditorRoute(projectId));
  }, [history, navigate, projectId]);

  return {
    ...history,
    ...tools,
    ...viewport,
    addConversationMessage: conversation.addMessage,
    assetsBasePath,
    canvasRef,
    chatOpen: tools.activeTool === "Chat",
    codeEditorRef,
    conversation,
    conversationMessages: conversation.displayMessages,
    handleApplyModification,
    handleApplyPageModification,
    handleCodeUpdate,
    historyOpen: tools.activeTool === "History",
    openChat: tools.openChat,
    panActive: tools.activeTool === "Pan Tool",
    pickerActive: tools.activeTool === "Element Picker",
    projectId,
    rectSelectorActive: tools.activeTool === "Rectangle Selector",
    viewportHeight: DEVICE_SIZES[viewport.device].height,
    viewportWidth: DEVICE_SIZES[viewport.device].width,
  };
}

export type EditorState = ReturnType<typeof useEditorState>;
