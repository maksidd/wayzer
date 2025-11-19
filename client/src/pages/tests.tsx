import { useEffect, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

const TestsPage = () => {
  const [, navigate] = useLocation();
  const [selectedScript, setSelectedScript] = useState<string | null>(null);
  const [scriptOutput, setScriptOutput] = useState<string>("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: () => apiRequest("/api/users/me").then((response) => response.json()),
  });

  const runScriptMutation = useMutation({
    mutationFn: async (scriptName: string) => {
      try {
        const token = localStorage.getItem("accessToken");
        console.log("[RUN-SCRIPT] Requesting:", scriptName, "Token present:", !!token);
        
        const response = await fetch("/api/admin/run-script", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({ scriptName }),
        });

        console.log("[RUN-SCRIPT] Response status:", response.status, response.statusText);
        console.log("[RUN-SCRIPT] Content-Type:", response.headers.get("content-type"));

        if (!response.ok) {
          const text = await response.text();
          console.error("[RUN-SCRIPT] Error response:", text.substring(0, 200));
          
          if (text.includes("<!DOCTYPE") || text.includes("<html")) {
            throw new Error(`Сервер вернул HTML вместо JSON. Статус: ${response.status}. Возможно, эндпоинт не найден или вы не авторизованы как администратор.`);
          }
          
          try {
            const json = JSON.parse(text);
            throw new Error(json.message || `Ошибка ${response.status}: ${text.substring(0, 100)}`);
          } catch {
            throw new Error(`Ошибка ${response.status}: ${text.substring(0, 200)}`);
          }
        }

        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          const text = await response.text();
          console.error("[RUN-SCRIPT] Non-JSON response:", text.substring(0, 200));
          throw new Error(`Сервер вернул не JSON. Content-Type: ${contentType}`);
        }

        return response.json();
      } catch (error: any) {
        console.error("[RUN-SCRIPT] Error:", error);
        throw error;
      }
    },
    onSuccess: (data) => {
      const output = data.output || "";
      const errors = data.errors || "";
      const fullOutput = output + (errors ? `\n\n--- Errors ---\n${errors}` : "");
      setScriptOutput(fullOutput);
      setIsDialogOpen(true);
    },
    onError: (error: any) => {
      const errorMessage = error.message || "Неизвестная ошибка";
      setScriptOutput(`Ошибка запуска скрипта:\n\n${errorMessage}\n\nПроверьте:\n- Вы авторизованы как администратор\n- Сервер запущен\n- Эндпоинт /api/admin/run-script доступен`);
      setIsDialogOpen(true);
    },
  });

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      sessionStorage.setItem("returnUrl", "/tests");
      navigate("/auth");
      return;
    }

    if (currentUser && currentUser.role !== "admin") {
      navigate("/");
    }
  }, [currentUser, navigate]);

  const handleRunScript = (scriptName: string) => {
    setSelectedScript(scriptName);
    setScriptOutput("Запуск скрипта...");
    setIsDialogOpen(true);
    runScriptMutation.mutate(scriptName);
  };

  if (isLoading || !currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Загрузка…</p>
      </div>
    );
  }

  const scripts = [
    { name: "wipe_data", label: "Wipe Data", description: "Очистка базы данных" },
    { name: "test_api", label: "Test API", description: "Тестирование API" },
    { name: "create_data", label: "Create Data", description: "Создание тестовых данных" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <Card>
          <CardHeader>
            <CardTitle>Tests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-700">
              Запуск тестовых скриптов и утилит для разработки.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              {scripts.map((script) => (
                <div key={script.name} className="border rounded-lg p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{script.label}</h3>
                    <p className="text-sm text-gray-500">{script.description}</p>
                  </div>
                  <Button
                    onClick={() => handleRunScript(script.name)}
                    disabled={runScriptMutation.isPending}
                    className="w-full"
                    variant="default"
                  >
                    {runScriptMutation.isPending && selectedScript === script.name
                      ? "Запуск..."
                      : "Запустить"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              Вывод скрипта: {selectedScript ? scripts.find((s) => s.name === selectedScript)?.label : ""}
            </DialogTitle>
            <DialogDescription>
              Результат выполнения скрипта
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-auto bg-black text-green-400 font-mono text-sm p-4 rounded border">
            <pre className="whitespace-pre-wrap break-words">
              {scriptOutput || "Ожидание вывода..."}
            </pre>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
            >
              Закрыть
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TestsPage;

