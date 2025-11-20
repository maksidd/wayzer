 
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldCheck, BookOpen, Gavel, Users } from "lucide-react";
import { useTranslation } from "react-i18next";

const RULES_COPY = {
  en: {
    heroTitle: {
      prefix: "Platform Rules ",
      highlight: "Wayzer"
    },
    heroDescription: "Read the main rules and principles for comfortable and safe user experience on the platform.",
    principles: [
      {
        key: "safety",
        title: "Safety",
        description: "Always be respectful to other users. Fraud, insults, discrimination, and spam are not allowed."
      },
      {
        key: "transparency",
        title: "Transparency",
        description: "Always provide accurate information about yourself and your trips. Do not provide false data."
      },
      {
        key: "responsibility",
        title: "Responsibility",
        description: "Stick to your trip agreements. Don’t cancel without a valid reason and always notify participants in advance."
      },
      {
        key: "community",
        title: "Community",
        description: "Help newcomers, share your experience, and keep a friendly atmosphere."
      }
    ],
    violationTitle: "Violation of Rules",
    violationDescription: "Violating the rules may result in temporary or permanent account suspension. If you encounter violations, contact support.",
    violationCta: "Register",
    agreementTitle: "User Agreement",
    sections: [
      {
        title: "1. General",
        description: "This agreement regulates the relationship between the user and the administration of the platform, which is designed for organizing joint trips, walks, and other activities."
      },
      {
        title: "2. Registration & Usage",
        description: "The user gives accurate information during registration and is responsible for all actions performed under their account."
      },
      {
        title: "3. Behavior on Platform",
        description: "Users must be respectful to all other members, not use the platform for illegal purposes, and not violate current laws."
      },
      {
        title: "4. What is not allowed",
        list: [
          "Offensive or discriminatory statements",
          "Sexual content",
          "Calls for violence, extremism, or illegal activity",
          "Advertising without admin approval"
        ]
      },
      {
        title: "5. Discussing Sensitive Topics",
        description: "The platform is intended only for finding and organizing joint activities. Please refrain from discussing political, religious, nationalistic, or other controversial topics in chats, comments, or trip descriptions. If you wish to discuss such matters, leave it for private meetings."
      },
      {
        title: "6. Liability",
        description: "The administration is not liable for user actions outside the platform. All arrangements between participants are voluntary and at their own risk."
      },
      {
        title: "7. Agreement Changes",
        description: "The administration reserves the right to make changes to the user agreement. Changes will be announced on the platform."
      },
      {
        title: "8. Contacts",
        description: "For questions regarding the platform, contact the administration via feedback form or the provided email address."
      }
    ]
  },
  ru: {
    heroTitle: {
      prefix: "Правила платформы ",
      highlight: "Wayzer"
    },
    heroDescription: "Познакомься с основными правилами и принципами, чтобы пользоваться платформой безопасно и комфортно.",
    principles: [
      {
        key: "safety",
        title: "Безопасность",
        description: "Относись уважительно к другим пользователям. Мошенничество, оскорбления, дискриминация и спам запрещены."
      },
      {
        key: "transparency",
        title: "Прозрачность",
        description: "Указывай только достоверную информацию о себе и своих поездках. Не предоставляй ложные данные."
      },
      {
        key: "responsibility",
        title: "Ответственность",
        description: "Соблюдай договорённости по поездкам. Не отменяй их без уважительной причины и всегда предупреждай участников."
      },
      {
        key: "community",
        title: "Сообщество",
        description: "Помогай новичкам, делись опытом и поддерживай дружелюбную атмосферу."
      }
    ],
    violationTitle: "Нарушение правил",
    violationDescription: "За нарушение правил аккаунт может быть временно заблокирован или удалён. Если заметил нарушение — напиши в поддержку.",
    violationCta: "Зарегистрироваться",
    agreementTitle: "Пользовательское соглашение",
    sections: [
      {
        title: "1. Общие положения",
        description: "Соглашение регулирует отношения между пользователем и администрацией платформы, предназначенной для организации совместных поездок, прогулок и других активностей."
      },
      {
        title: "2. Регистрация и использование",
        description: "Пользователь предоставляет достоверные данные при регистрации и несёт ответственность за все действия, совершённые под его аккаунтом."
      },
      {
        title: "3. Поведение на платформе",
        description: "Участники обязаны уважительно общаться, не использовать платформу в незаконных целях и не нарушать действующие законы."
      },
      {
        title: "4. Запрещено",
        list: [
          "Оскорбительные или дискриминационные высказывания",
          "Публикация сексуального контента",
          "Призывы к насилию, экстремизму или незаконным действиям",
          "Реклама без согласования с администрацией"
        ]
      },
      {
        title: "5. Обсуждение чувствительных тем",
        description: "Платформа предназначена только для поиска попутчиков и организации совместных активностей. Пожалуйста, воздержись от политических, религиозных и других спорных тем в чатах и описаниях."
      },
      {
        title: "6. Ответственность",
        description: "Администрация не несёт ответственности за действия пользователей вне платформы. Все договорённости заключаются участниками добровольно и на свой риск."
      },
      {
        title: "7. Изменения соглашения",
        description: "Администрация оставляет за собой право изменять соглашение. Обновления публикуются на платформе."
      },
      {
        title: "8. Контакты",
        description: "По вопросам, связанным с платформой, обращайся через форму обратной связи или на указанный email."
      }
    ]
  }
} as const;

export default function Rules() {
  const [, setLocation] = useLocation();
  const { i18n } = useTranslation();
  const locale = (i18n.resolvedLanguage ?? i18n.language ?? "en").startsWith("ru") ? "ru" : "en";
  const copy = RULES_COPY[locale];
  const principleIconMap = {
    safety: ShieldCheck,
    transparency: BookOpen,
    responsibility: Gavel,
    community: Users,
  } as const;

  const { data: user } = useQuery({
    queryKey: ["/api/users/me"],
    queryFn: async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) return null;
      const response = await fetch("/api/users/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return null;
      return response.json();
    },
    retry: false,
  });

  const handleAuthClick = (mode?: string) => {
    sessionStorage.setItem("returnUrl", window.location.pathname);
    setLocation("/auth");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
            {copy.heroTitle.prefix}
            <span className="text-blue-600 dark:text-blue-400">{copy.heroTitle.highlight}</span>
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto leading-relaxed">
            {copy.heroDescription}
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          {copy.principles.map((principle) => {
            const Icon = principleIconMap[principle.key as keyof typeof principleIconMap];
            const colorConfig =
              principle.key === "safety"
                ? { bg: "bg-blue-100 dark:bg-blue-900", text: "text-blue-600 dark:text-blue-400" }
                : principle.key === "transparency"
                  ? { bg: "bg-green-100 dark:bg-green-900", text: "text-green-600 dark:text-green-400" }
                  : principle.key === "responsibility"
                    ? { bg: "bg-purple-100 dark:bg-purple-900", text: "text-purple-600 dark:text-purple-400" }
                    : { bg: "bg-yellow-100 dark:bg-yellow-900", text: "text-yellow-600 dark:text-yellow-400" };
            return (
              <Card key={principle.title} className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-0 shadow-xl">
                <CardHeader className="text-center pb-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${colorConfig.bg}`}>
                    <Icon className={`h-8 w-8 ${colorConfig.text}`} />
                  </div>
                  <CardTitle className="text-gray-900 dark:text-white">{principle.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-center text-gray-600 dark:text-gray-300">
                    {principle.description}
                  </CardDescription>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{copy.violationTitle}</h2>
          <p className="text-md text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-6">
            {copy.violationDescription}
          </p>
          {!user && (
            <Button size="lg" onClick={() => handleAuthClick("register")} className="bg-blue-600 hover:bg-blue-700 text-white">
              {copy.violationCta}
            </Button>
          )}
        </div>

        <Card className="mb-12 bg-white/90 dark:bg-gray-800/90 border-0 shadow-xl">
          <CardHeader>
            <CardTitle className="text-2xl md:text-3xl text-gray-900 dark:text-white mb-2">{copy.agreementTitle}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {copy.sections.map((section) => (
              <section key={section.title}>
                <h3 className="text-xl font-semibold mb-2 text-blue-700 dark:text-blue-300">{section.title}</h3>
                {section.description && (
                  <p className="text-gray-700 dark:text-gray-300">{section.description}</p>
                )}
                {section.list && (
                  <ul className="list-disc pl-6 text-gray-700 dark:text-gray-300 space-y-1">
                    {section.list.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </CardContent>
        </Card>

      </main>
    </div>
  );
} 