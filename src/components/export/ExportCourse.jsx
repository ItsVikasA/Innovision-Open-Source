"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";

const ExportCourse = ({ courseId, courseTitle }) => {
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const fetchCourseData = async () => {
    try {
      const response = await fetch(`/api/roadmap/${courseId}`);
      if (!response.ok) throw new Error("Failed to fetch course");
      const data = await response.json();

      // Fetch content for each chapter
      const chaptersWithContent = await Promise.all(
        data.chapters.map(async (chapter, index) => {
          try {
            const chapterResponse = await fetch(`/api/get-chapter/${courseId}/${index + 1}`);
            if (chapterResponse.ok) {
              const chapterData = await chapterResponse.json();
              return {
                ...chapter,
                fullContent: chapterData.chapter?.content || "",
                tasks: chapterData.chapter?.tasks || []
              };
            }
          } catch (error) {
            console.error(`Error fetching chapter ${index + 1}:`, error);
          }
          return chapter;
        })
      );

      return {
        ...data,
        chapters: chaptersWithContent
      };
    } catch (error) {
      console.error("Error fetching course:", error);
      throw error;
    }
  };

  const generatePDF = async () => {
    setExporting(true);

    try {
      // Fetch course data
      const courseData = await fetchCourseData();

      console.log("Course data:", courseData); // Debug log

      // Create PDF
      const doc = new jsPDF();
      let yPosition = 20;
      const pageHeight = doc.internal.pageSize.height;
      const pageWidth = doc.internal.pageSize.width;
      const margin = 20;
      const maxWidth = pageWidth - 2 * margin;
      const lineHeight = 6;

      // Helper function to add new page if needed
      const checkPageBreak = (requiredSpace = 15) => {
        if (yPosition + requiredSpace > pageHeight - 20) {
          doc.addPage();
          yPosition = 20;
          return true;
        }
        return false;
      };

      const renderLines = (text, { indent = 0, fontSize = 10, font = "helvetica", style = "normal", color = [0, 0, 0], gap = lineHeight } = {}) => {
        if (!text && text !== 0) return;

        doc.setFontSize(fontSize);
        doc.setFont(font, style);
        doc.setTextColor(...color);

        const availableWidth = maxWidth - indent;
        const lines = doc.splitTextToSize(String(text), availableWidth);

        lines.forEach((line) => {
          checkPageBreak(gap + 2);
          doc.text(line, margin + indent, yPosition);
          yPosition += gap;
        });
      };

      const renderBulletList = (items, indent = 5) => {
        if (!Array.isArray(items) || items.length === 0) return;

        items.forEach((item) => {
          if (item == null || item === "") return;

          if (typeof item === "string" || typeof item === "number") {
            renderLines(`• ${item}`, { indent, gap: lineHeight });
            return;
          }

          if (typeof item === "object" && !Array.isArray(item)) {
            if (item.type) {
              renderContentBlock(item);
              return;
            }

            if (item.title || item.name) {
              renderLines(item.title || item.name, { indent, fontSize: 11, font: "helvetica", style: "bold", color: [118, 75, 162], gap: 7 });
            }

            if (item.content) {
              renderContentValue(item.content, indent + 5);
            }
          }
        });
      };

      const renderContentValue = (value, indent = 0) => {
        if (value == null || value === "") return;

        if (typeof value === "string" || typeof value === "number") {
          renderLines(value, { indent, gap: lineHeight });
          yPosition += 1;
          return;
        }

        if (Array.isArray(value)) {
          const isSimpleList = value.every((item) => typeof item === "string" || typeof item === "number");
          if (isSimpleList) {
            renderBulletList(value, indent + 5);
            yPosition += 2;
            return;
          }

          value.forEach((item) => renderContentValue(item, indent));
          return;
        }

        if (typeof value === "object") {
          if (value.type && value.content !== undefined) {
            renderContentBlock(value);
            return;
          }

          if (value.title || value.name) {
            renderLines(value.title || value.name, { indent, fontSize: 11, font: "helvetica", style: "bold", color: [118, 75, 162], gap: 7 });
          }

          if (value.description) {
            renderLines(value.description, { indent, gap: lineHeight });
          }

          if (value.content !== undefined) {
            renderContentValue(value.content, indent);
          }
        }
      };

      const renderSection = (title, value, { indent = 0, titleColor = [102, 126, 234] } = {}) => {
        if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return;

        checkPageBreak(18);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(...titleColor);
        doc.text(title, margin + indent, yPosition);
        yPosition += 8;

        renderContentValue(value, indent + 5);
        yPosition += 4;
      };

      // Title Page
      doc.setFontSize(28);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(102, 126, 234);
      const titleLines = doc.splitTextToSize(courseTitle, maxWidth);
      titleLines.forEach((line) => {
        doc.text(line, margin, yPosition);
        yPosition += 12;
      });
      yPosition += 10;

      // Description
      if (courseData.courseDescription) {
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(80, 80, 80);
        const descLines = doc.splitTextToSize(courseData.courseDescription, maxWidth);
        descLines.forEach((line) => {
          checkPageBreak();
          doc.text(line, margin, yPosition);
          yPosition += lineHeight;
        });
        yPosition += 10;
      }

      // Metadata box
      doc.setDrawColor(200, 200, 200);
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPosition, maxWidth, 25, 'FD');
      yPosition += 8;

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text(`Difficulty: `, margin + 5, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${courseData.difficulty || "Balanced"}`, margin + 30, yPosition);
      yPosition += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`Chapters: `, margin + 5, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${courseData.chapters?.length || 0}`, margin + 30, yPosition);
      yPosition += 7;

      doc.setFont("helvetica", "bold");
      doc.text(`Created: `, margin + 5, yPosition);
      doc.setFont("helvetica", "normal");
      doc.text(`${courseData.createdAt || new Date().toLocaleDateString()}`, margin + 30, yPosition);
      yPosition += 15;

      // New page for TOC
      doc.addPage();
      yPosition = 20;

      // Table of Contents
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(0, 0, 0);
      doc.text("Table of Contents", margin, yPosition);
      yPosition += 12;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      courseData.chapters?.forEach((chapter, index) => {
        checkPageBreak();
        const chapterTitle = chapter.chapterTitle || chapter.title || `Chapter ${index + 1}`;
        doc.text(`${index + 1}. ${chapterTitle}`, margin + 5, yPosition);
        yPosition += 7;
      });

      // New page for chapters
      doc.addPage();
      yPosition = 20;

      // Chapters - FULL CONTENT
      courseData.chapters?.forEach((chapter, index) => {
        // New page for each chapter
        if (index > 0) {
          doc.addPage();
          yPosition = 20;
        }

        // Chapter number and title
        doc.setFontSize(18);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(118, 75, 162);
        const chapterTitle = `Chapter ${index + 1}: ${chapter.chapterTitle || chapter.title || `Chapter ${index + 1}`}`;
        const titleLines = doc.splitTextToSize(chapterTitle, maxWidth);
        titleLines.forEach((line) => {
          doc.text(line, margin, yPosition);
          yPosition += 10;
        });
        yPosition += 5;

        // Chapter description
        if (chapter.chapterDescription || chapter.description) {
          doc.setFontSize(11);
          doc.setFont("helvetica", "italic");
          doc.setTextColor(100, 100, 100);
          const descLines = doc.splitTextToSize(chapter.chapterDescription || chapter.description, maxWidth);
          descLines.forEach((line) => {
            checkPageBreak();
            doc.text(line, margin, yPosition);
            yPosition += lineHeight;
          });
          yPosition += 8;
        }

        // Chapter content - FULL EXPORT
        const chapterData = chapter.fullContent;

        if (chapterData && typeof chapterData === 'object') {
          doc.setFontSize(10);
          doc.setFont("helvetica", "normal");
          doc.setTextColor(0, 0, 0);

          // Learning Objectives
          if (chapterData.learningObjectives && chapterData.learningObjectives.length > 0) {
            renderSection("Learning Objectives", chapterData.learningObjectives);
          }

          if (chapterData.chapterDescription) {
            renderSection("Chapter Overview", chapterData.chapterDescription, { titleColor: [100, 100, 100] });
          }

          if (chapterData.introduction) {
            renderSection("Introduction", chapterData.introduction, { titleColor: [100, 100, 100] });
          }

          if (chapterData.mainContent) {
            renderSection("Main Content", chapterData.mainContent);
          }

          if (chapterData.keyPoints && chapterData.keyPoints.length > 0) {
            renderSection("Key Points", chapterData.keyPoints);
          }

          if (chapterData.examples && chapterData.examples.length > 0) {
            renderSection("Examples", chapterData.examples);
          }

          if (chapterData.otherResources && chapterData.otherResources.length > 0) {
            renderSection("Other Resources", chapterData.otherResources);
          }

          if (chapterData.contentOutline && chapterData.contentOutline.length > 0) {
            renderSection("Content Outline", chapterData.contentOutline);
          }

          if (chapterData.content) {
            renderSection("Chapter Content", chapterData.content);
          }

          // Subtopics (Main Content)
          if (chapterData.subtopics && chapterData.subtopics.length > 0) {
            chapterData.subtopics.forEach((subtopic, subIndex) => {
              checkPageBreak(15);

              // Subtopic title
              doc.setFontSize(12);
              doc.setFont("helvetica", "bold");
              doc.setTextColor(118, 75, 162);
              const titleLines = doc.splitTextToSize(subtopic.title || subtopic.name || "", maxWidth);
              titleLines.forEach((line) => {
                doc.text(line, margin, yPosition);
                yPosition += 8;
              });

              // Subtopic content
              // Subtopic content
              const content = subtopic.content || subtopic.description || "";

              if (content) {
                const renderContentBlock = (block) => {
                  if (block == null || block === "") return;

                  if (typeof block === 'string' || typeof block === 'number') {
                    const sections = String(block).split('```');

                    sections.forEach((section, sectionIndex) => {
                      const isCodeBlock = sectionIndex % 2 === 1;
                      if (isCodeBlock) {
                        const code = section.replace(/```[a-z]*\n|```/g, '').trim();
                        const codeLines = code.split('\n');

                        doc.setFont("courier", "normal");
                        doc.setFontSize(9);
                        doc.setTextColor(50, 50, 50);

                        codeLines.forEach((line) => {
                          checkPageBreak(8);
                          doc.setFillColor(248, 248, 248);
                          doc.rect(margin, yPosition - 4, maxWidth, 6, 'F');

                          if (line.length > 80) {
                            const codeParts = doc.splitTextToSize(line, maxWidth - 6);
                            codeParts.forEach((part) => {
                              checkPageBreak(6);
                              doc.setFillColor(248, 248, 248);
                              doc.rect(margin, yPosition - 4, maxWidth, 6, 'F');
                              doc.text(part, margin + 2, yPosition);
                              yPosition += 5;
                            });
                          } else {
                            doc.text(line, margin + 2, yPosition);
                            yPosition += 5;
                          }
                        });

                        yPosition += 4;
                        doc.setFont("helvetica", "normal");
                        doc.setFontSize(10);
                        doc.setTextColor(0, 0, 0);
                      } else {
                        const paragraphs = section.split('\n\n');
                        paragraphs.forEach((p) => {
                          if (p.trim()) {
                            renderLines(p.trim(), { gap: lineHeight });
                          }
                        });
                        yPosition += 2;
                      }
                    });
                    return;
                  }

                  if (Array.isArray(block)) {
                    block.forEach(renderContentBlock);
                    return;
                  }

                  if (typeof block === 'object') {
                    const type = block.type;
                    const blockContent = block.content;

                    if (!blockContent) return;

                    if (type === 'code') {
                      const code = typeof blockContent === 'string' ? blockContent.replace(/```[a-z]*\n|```/g, '') : JSON.stringify(blockContent, null, 2);
                      const codeLines = code.split('\n');

                      doc.setFont("courier", "normal");
                      doc.setFontSize(9);
                      doc.setTextColor(50, 50, 50);

                      codeLines.forEach((line) => {
                        checkPageBreak(8);
                        doc.setFillColor(248, 248, 248);
                        doc.rect(margin, yPosition - 4, maxWidth, 6, 'F');

                        if (line.length > 80) {
                          const codeParts = doc.splitTextToSize(line, maxWidth - 6);
                          codeParts.forEach((part) => {
                            checkPageBreak(6);
                            doc.setFillColor(248, 248, 248);
                            doc.rect(margin, yPosition - 4, maxWidth, 6, 'F');
                            doc.text(part, margin + 2, yPosition);
                            yPosition += 5;
                          });
                        } else {
                          doc.text(line, margin + 2, yPosition);
                          yPosition += 5;
                        }
                      });

                      yPosition += 4;
                      doc.setFont("helvetica", "normal");
                      doc.setFontSize(10);
                      doc.setTextColor(0, 0, 0);
                    } else if (type === 'points' || Array.isArray(blockContent)) {
                      renderBulletList(Array.isArray(blockContent) ? blockContent : [blockContent], 5);
                      yPosition += 2;
                    } else if (type?.startsWith('header')) {
                      doc.setFont("helvetica", "bold");
                      renderLines(blockContent, { fontSize: 12, style: "bold", color: [118, 75, 162], gap: lineHeight + 2 });
                      doc.setFont("helvetica", "normal");
                    } else {
                      renderContentValue(blockContent);
                    }
                  }
                };

                if (Array.isArray(content)) {
                  content.forEach(renderContentBlock);
                } else if (typeof content === 'object') {
                  renderContentValue(content);
                } else {
                  renderContentBlock(content);
                }
              }

              yPosition += 8;
            });
          }
        }

        // Tasks section if exists
        if (chapter.tasks && chapter.tasks.length > 0) {
          checkPageBreak(15);
          doc.setFontSize(14);
          doc.setFont("helvetica", "bold");
          doc.setTextColor(102, 126, 234);
          doc.text("Practice Tasks", margin, yPosition);
          yPosition += 10;

          chapter.tasks.forEach((task, taskIndex) => {
            checkPageBreak(10);
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(0, 0, 0);
            doc.text(`Task ${taskIndex + 1}: ${task.title || task.question}`, margin + 5, yPosition);
            yPosition += 7;

            if (task.description) {
              doc.setFont("helvetica", "normal");
              doc.setFontSize(10);
              const taskLines = doc.splitTextToSize(task.description, maxWidth - 10);
              taskLines.forEach((line) => {
                checkPageBreak();
                doc.text(line, margin + 10, yPosition);
                yPosition += lineHeight;
              });
              yPosition += 5;
            }
          });
        }

        yPosition += 10;
      });

      // Footer on all pages
      const totalPages = doc.internal.pages.length - 1;
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Exported from InnoVision - Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      }

      // Save PDF
      const filename = `${courseTitle.replace(/[^a-z0-9]/gi, "_").toLowerCase()}.pdf`;
      doc.save(filename);

      toast.success("Course exported as PDF with all content!");
      setOpen(false);
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export course: " + error.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Export PDF
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Course as PDF</DialogTitle>
          <DialogDescription>
            Download "{courseTitle}" as a formatted PDF document
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-4 border rounded-lg bg-muted/50">
            <div className="flex items-start gap-3">
              <FileText className="h-6 w-6 text-primary mt-1" />
              <div>
                <h4 className="font-semibold mb-1">PDF Export</h4>
                <p className="text-sm text-muted-foreground">
                  Includes all chapters with formatted content and code blocks
                </p>
              </div>
            </div>
          </div>

          <Button
            onClick={generatePDF}
            disabled={exporting}
            className="w-full gap-2"
            size="lg"
          >
            {exporting ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Generating PDF...
              </>
            ) : (
              <>
                <Download className="h-5 w-5" />
                Download PDF
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ExportCourse;
