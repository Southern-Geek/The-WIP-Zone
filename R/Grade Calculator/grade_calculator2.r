# Simplified Grade Calculator and Course Performance Tracker
# Using only base Shiny packages (no additional dependencies)

install.packages(c("shiny", "ggplot2", "dplyr"))

# Load required libraries (base Shiny only)
library(shiny)
library(ggplot2)
library(dplyr)

# =============================================================================
# DATA STRUCTURES AND FUNCTIONS
# =============================================================================

# Define grading scales
grading_scales <- list(
  "Standard" = data.frame(
    Grade = c("A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "F"),
    Min_Percent = c(97, 93, 90, 87, 83, 80, 77, 73, 70, 67, 63, 0),
    GPA_Points = c(4.0, 4.0, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0, 1.7, 1.3, 1.0, 0.0)
  ),
  "Plus/Minus" = data.frame(
    Grade = c("A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-", "D+", "D", "D-", "F"),
    Min_Percent = c(97, 93, 90, 87, 83, 80, 77, 73, 70, 67, 63, 60, 0),
    GPA_Points = c(4.0, 4.0, 3.7, 3.3, 3.0, 2.7, 2.3, 2.0, 1.7, 1.3, 1.0, 0.7, 0.0)
  )
)

# Function to calculate letter grade
calculate_letter_grade <- function(percentage, scale = "Standard") {
  scale_data <- grading_scales[[scale]]
  for (i in 1:nrow(scale_data)) {
    if (percentage >= scale_data$Min_Percent[i]) {
      return(list(
        grade = scale_data$Grade[i],
        gpa = scale_data$GPA_Points[i]
      ))
    }
  }
  return(list(grade = "F", gpa = 0.0))
}

# Function to calculate what grade is needed
calculate_needed_grade <- function(current_points, current_weight, target_grade, remaining_weight) {
  if (remaining_weight <= 0) return(0)
  target_points <- target_grade / 100
  current_contribution <- current_points * current_weight / 100
  needed_contribution <- target_points - current_contribution
  needed_grade <- (needed_contribution * 100) / remaining_weight
  return(round(needed_grade, 2))
}

# =============================================================================
# UI DEFINITION
# =============================================================================

ui <- fluidPage(
  # Custom CSS
  tags$head(
    tags$style(HTML("
      .navbar-brand {
        font-size: 24px;
        font-weight: bold;
      }
      .grade-display {
        font-size: 28px;
        font-weight: bold;
        text-align: center;
        padding: 20px;
        border-radius: 10px;
        margin: 15px 0;
        border: 2px solid;
      }
      .grade-A { background-color: #d4edda; color: #155724; border-color: #155724; }
      .grade-B { background-color: #cce5ff; color: #004085; border-color: #004085; }
      .grade-C { background-color: #fff3cd; color: #856404; border-color: #856404; }
      .grade-D { background-color: #f8d7da; color: #721c24; border-color: #721c24; }
      .grade-F { background-color: #f5c6cb; color: #721c24; border-color: #721c24; }
      .gpa-display {
        background-color: #e7f3ff;
        border: 2px solid #007bff;
        color: #007bff;
        font-size: 24px;
        font-weight: bold;
        text-align: center;
        padding: 15px;
        border-radius: 8px;
        margin: 10px 0;
      }
      .metric-box {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 15px;
        margin: 10px 0;
        text-align: center;
      }
      .metric-value {
        font-size: 20px;
        font-weight: bold;
        color: #495057;
      }
      .metric-label {
        font-size: 14px;
        color: #6c757d;
        margin-top: 5px;
      }
      .well {
        background-color: #f8f9fa;
        border: 1px solid #dee2e6;
        border-radius: 8px;
        padding: 20px;
        margin: 15px 0;
      }
      .btn-custom {
        margin: 5px;
        padding: 8px 16px;
      }
    "))
  ),
  
  # Navigation
  navbarPage(
    title = "📚 Grade Calculator & Performance Tracker",
    theme = "bootstrap.min.css",
    
    # ==========================================================================
    # COURSE MANAGEMENT TAB
    # ==========================================================================
    tabPanel("📖 Course Manager",
      fluidRow(
        column(12,
          div(class = "well",
            h3("➕ Add New Course"),
            fluidRow(
              column(3, 
                textInput("course_name", "Course Name", 
                         placeholder = "e.g., Calculus I")
              ),
              column(3, 
                textInput("course_code", "Course Code", 
                         placeholder = "e.g., MATH 101")
              ),
              column(2, 
                numericInput("course_credits", "Credits", 
                           value = 3, min = 1, max = 6)
              ),
              column(2, 
                selectInput("grading_scale", "Grading Scale", 
                           choices = names(grading_scales))
              ),
              column(2, 
                br(),
                actionButton("add_course", "Add Course", 
                           class = "btn btn-primary btn-custom")
              )
            )
          )
        )
      ),
      
      fluidRow(
        column(12,
          h3("📋 My Courses"),
          tableOutput("courses_table")
        )
      )
    ),
    
    # ==========================================================================
    # GRADE CALCULATOR TAB
    # ==========================================================================
    tabPanel("🧮 Grade Calculator",
      fluidRow(
        column(4,
          div(class = "well",
            h3("Select Course"),
            selectInput("selected_course", "Choose Course", choices = NULL),
            
            hr(),
            h4("➕ Add Assignment/Exam"),
            textInput("assignment_name", "Assignment Name", 
                     placeholder = "e.g., Midterm Exam"),
            numericInput("assignment_points", "Points Earned", 
                        value = 0, min = 0),
            numericInput("assignment_total", "Total Points", 
                        value = 100, min = 1),
            numericInput("assignment_weight", "Weight (%)", 
                        value = 10, min = 0, max = 100),
            selectInput("assignment_category", "Category", 
                       choices = c("Homework", "Quiz", "Exam", "Project", "Lab", "Participation")),
            actionButton("add_assignment", "Add Assignment", 
                        class = "btn btn-success btn-custom")
          )
        ),
        
        column(8,
          h3("📊 Current Grade"),
          uiOutput("current_grade_display"),
          
          br(),
          h4("📈 Grade Breakdown"),
          plotOutput("grade_breakdown_plot", height = "300px"),
          
          br(),
          h4("📝 Assignments"),
          tableOutput("assignments_table")
        )
      )
    ),
    
    # ==========================================================================
    # PERFORMANCE ANALYSIS TAB
    # ==========================================================================
    tabPanel("📈 Performance Analysis",
      fluidRow(
        column(4,
          h3("🎓 Overall GPA"),
          uiOutput("gpa_display"),
          
          br(),
          h4("📊 Semester Summary"),
          tableOutput("semester_summary")
        ),
        
        column(8,
          h3("📉 Course Performance"),
          plotOutput("course_comparison_plot", height = "400px")
        )
      )
    ),
    
    # ==========================================================================
    # GOAL SETTING TAB
    # ==========================================================================
    tabPanel("🎯 Goals & Study Tracker",
      fluidRow(
        column(6,
          div(class = "well",
            h3("🎯 Grade Goals"),
            selectInput("goal_course", "Select Course", choices = NULL),
            numericInput("target_grade", "Target Grade (%)", 
                        value = 90, min = 0, max = 100),
            actionButton("calculate_needed", "Calculate What's Needed", 
                        class = "btn btn-info btn-custom"),
            br(), br(),
            uiOutput("goal_results")
          )
        ),
        
        column(6,
          div(class = "well",
            h3("📚 Study Time Tracker"),
            selectInput("study_course", "Course", choices = NULL),
            dateInput("study_date", "Date", value = Sys.Date()),
            numericInput("study_hours", "Hours Studied", 
                        value = 0, min = 0, max = 24, step = 0.5),
            textAreaInput("study_notes", "Study Notes", rows = 3),
            actionButton("add_study_time", "Log Study Time", 
                        class = "btn btn-success btn-custom")
          )
        )
      ),
      
      fluidRow(
        column(12,
          h3("📊 Study Time Analysis"),
          plotOutput("study_time_plot", height = "350px")
        )
      )
    ),
    
    # ==========================================================================
    # REPORTS TAB
    # ==========================================================================
    tabPanel("📋 Reports",
      fluidRow(
        column(4,
          h3("📖 Academic Overview"),
          tableOutput("report_overview")
        ),
        column(4,
          h3("📊 Grade Distribution"),
          plotOutput("grade_distribution", height = "300px")
        ),
        column(4,
          h3("📈 Performance Metrics"),
          uiOutput("performance_metrics")
        )
      ),
      
      br(),
      fluidRow(
        column(12,
          div(style = "text-align: center;",
            downloadButton("download_report", "📥 Download Full Report", 
                          class = "btn btn-primary btn-lg")
          )
        )
      )
    )
  )
)

# =============================================================================
# SERVER LOGIC
# =============================================================================

server <- function(input, output, session) {
  
  # Reactive values to store data
  values <- reactiveValues(
    courses = data.frame(
      Course_Name = character(0),
      Course_Code = character(0),
      Credits = numeric(0),
      Grading_Scale = character(0),
      Current_Grade = numeric(0),
      Letter_Grade = character(0),
      GPA_Points = numeric(0),
      stringsAsFactors = FALSE
    ),
    assignments = data.frame(
      Course = character(0),
      Assignment = character(0),
      Points_Earned = numeric(0),
      Total_Points = numeric(0),
      Percentage = numeric(0),
      Weight = numeric(0),
      Category = character(0),
      Date_Added = as.Date(character(0)),
      stringsAsFactors = FALSE
    ),
    study_log = data.frame(
      Course = character(0),
      Date = as.Date(character(0)),
      Hours = numeric(0),
      Notes = character(0),
      stringsAsFactors = FALSE
    )
  )
  
  # Add course
  observeEvent(input$add_course, {
    if (input$course_name != "" && input$course_code != "") {
      new_course <- data.frame(
        Course_Name = input$course_name,
        Course_Code = input$course_code,
        Credits = input$course_credits,
        Grading_Scale = input$grading_scale,
        Current_Grade = 0,
        Letter_Grade = "N/A",
        GPA_Points = 0,
        stringsAsFactors = FALSE
      )
      values$courses <- rbind(values$courses, new_course)
      
      # Update course choices
      course_choices <- setNames(values$courses$Course_Code, 
                                paste(values$courses$Course_Code, "-", values$courses$Course_Name))
      updateSelectInput(session, "selected_course", choices = course_choices)
      updateSelectInput(session, "goal_course", choices = course_choices)
      updateSelectInput(session, "study_course", choices = course_choices)
      
      # Clear inputs
      updateTextInput(session, "course_name", value = "")
      updateTextInput(session, "course_code", value = "")
      updateNumericInput(session, "course_credits", value = 3)
      
      showNotification("Course added successfully!", type = "success")
    }
  })
  
  # Add assignment
  observeEvent(input$add_assignment, {
    if (!is.null(input$selected_course) && input$assignment_name != "") {
      percentage <- (input$assignment_points / input$assignment_total) * 100
      
      new_assignment <- data.frame(
        Course = input$selected_course,
        Assignment = input$assignment_name,
        Points_Earned = input$assignment_points,
        Total_Points = input$assignment_total,
        Percentage = percentage,
        Weight = input$assignment_weight,
        Category = input$assignment_category,
        Date_Added = Sys.Date(),
        stringsAsFactors = FALSE
      )
      values$assignments <- rbind(values$assignments, new_assignment)
      
      # Update course grade
      course_assignments <- values$assignments[values$assignments$Course == input$selected_course, ]
      if (nrow(course_assignments) > 0) {
        total_weight <- sum(course_assignments$Weight)
        if (total_weight > 0) {
          weighted_grade <- sum(course_assignments$Percentage * course_assignments$Weight) / total_weight
          
          # Update courses table
          course_idx <- which(values$courses$Course_Code == input$selected_course)
          values$courses$Current_Grade[course_idx] <- weighted_grade
          
          # Calculate letter grade
          grading_scale <- values$courses$Grading_Scale[course_idx]
          letter_info <- calculate_letter_grade(weighted_grade, grading_scale)
          values$courses$Letter_Grade[course_idx] <- letter_info$grade
          values$courses$GPA_Points[course_idx] <- letter_info$gpa
        }
      }
      
      # Clear inputs
      updateTextInput(session, "assignment_name", value = "")
      updateNumericInput(session, "assignment_points", value = 0)
      updateNumericInput(session, "assignment_total", value = 100)
      
      showNotification("Assignment added successfully!", type = "success")
    }
  })
  
  # Add study time
  observeEvent(input$add_study_time, {
    if (!is.null(input$study_course) && input$study_hours > 0) {
      new_study <- data.frame(
        Course = input$study_course,
        Date = input$study_date,
        Hours = input$study_hours,
        Notes = input$study_notes,
        stringsAsFactors = FALSE
      )
      values$study_log <- rbind(values$study_log, new_study)
      
      # Clear inputs
      updateNumericInput(session, "study_hours", value = 0)
      updateTextAreaInput(session, "study_notes", value = "")
      
      showNotification("Study time logged successfully!", type = "success")
    }
  })
  
  # Calculate needed grade
  observeEvent(input$calculate_needed, {
    if (!is.null(input$goal_course)) {
      course_assignments <- values$assignments[values$assignments$Course == input$goal_course, ]
      
      if (nrow(course_assignments) > 0) {
        total_weight_used <- sum(course_assignments$Weight)
        remaining_weight <- 100 - total_weight_used
        
        if (remaining_weight > 0) {
          current_weighted_points <- sum(course_assignments$Percentage * course_assignments$Weight)
          current_grade <- current_weighted_points / total_weight_used
          
          needed_grade <- calculate_needed_grade(
            current_grade, total_weight_used, input$target_grade, remaining_weight
          )
          
          output$goal_results <- renderUI({
            div(
              h4("🎯 Goal Analysis Results"),
              div(class = "metric-box",
                div(class = "metric-value", paste0(round(current_grade, 1), "%")),
                div(class = "metric-label", "Current Grade")
              ),
              div(class = "metric-box",
                div(class = "metric-value", paste0(remaining_weight, "%")),
                div(class = "metric-label", "Remaining Weight")
              ),
              div(class = "metric-box",
                div(class = "metric-value", 
                    style = paste0("color: ", 
                                  ifelse(needed_grade > 100, "red", 
                                        ifelse(needed_grade > 90, "orange", "green"))),
                    paste0(needed_grade, "%")),
                div(class = "metric-label", "Grade Needed")
              ),
              if (needed_grade > 100) {
                div(style = "color: red; font-weight: bold; margin-top: 10px;",
                    "⚠️ Target grade may not be achievable")
              } else if (needed_grade > 95) {
                div(style = "color: orange; font-weight: bold; margin-top: 10px;",
                    "⚡ High performance required")
              } else {
                div(style = "color: green; font-weight: bold; margin-top: 10px;",
                    "✅ Target grade is achievable")
              }
            )
          })
        } else {
          output$goal_results <- renderUI({
            div(style = "color: orange; font-weight: bold;",
                "📝 All assignments completed for this course.")
          })
        }
      } else {
        output$goal_results <- renderUI({
          div(style = "color: red; font-weight: bold;",
              "❌ No assignments found for this course.")
        })
      }
    }
  })
  
  # Render courses table
  output$courses_table <- renderTable({
    if (nrow(values$courses) > 0) {
      display_courses <- values$courses
      display_courses$Current_Grade <- round(display_courses$Current_Grade, 2)
      display_courses$GPA_Points <- round(display_courses$GPA_Points, 2)
      names(display_courses) <- c("Course Name", "Code", "Credits", "Scale", 
                                 "Current %", "Letter", "GPA Pts")
      display_courses
    }
  }, striped = TRUE, hover = TRUE)
  
  # Render assignments table
  output$assignments_table <- renderTable({
    if (!is.null(input$selected_course)) {
      course_assignments <- values$assignments[values$assignments$Course == input$selected_course, ]
      if (nrow(course_assignments) > 0) {
        display_assignments <- course_assignments[, c("Assignment", "Points_Earned", "Total_Points", 
                                                     "Percentage", "Weight", "Category")]
        display_assignments$Percentage <- round(display_assignments$Percentage, 1)
        names(display_assignments) <- c("Assignment", "Earned", "Total", "Percent", "Weight", "Category")
        display_assignments
      }
    }
  }, striped = TRUE, hover = TRUE)
  
  # Current grade display
  output$current_grade_display <- renderUI({
    if (!is.null(input$selected_course)) {
      course_idx <- which(values$courses$Course_Code == input$selected_course)
      if (length(course_idx) > 0) {
        current_grade <- values$courses$Current_Grade[course_idx]
        letter_grade <- values$courses$Letter_Grade[course_idx]
        
        if (letter_grade != "N/A") {
          grade_class <- paste0("grade-", substr(letter_grade, 1, 1))
          
          div(
            class = paste("grade-display", grade_class),
            paste0(round(current_grade, 1), "% (", letter_grade, ")")
          )
        } else {
          div(
            class = "grade-display",
            style = "background-color: #f8f9fa; color: #6c757d; border-color: #dee2e6;",
            "No assignments yet"
          )
        }
      }
    }
  })
  
  # GPA display
  output$gpa_display <- renderUI({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        total_points <- sum(courses_with_grades$GPA_Points * courses_with_grades$Credits)
        total_credits <- sum(courses_with_grades$Credits)
        gpa <- if (total_credits > 0) total_points / total_credits else 0
        
        div(
          class = "gpa-display",
          paste0("GPA: ", round(gpa, 3))
        )
      } else {
        div(
          class = "gpa-display",
          "GPA: Not calculated yet"
        )
      }
    }
  })
  
  # Grade breakdown plot
  output$grade_breakdown_plot <- renderPlot({
    if (!is.null(input$selected_course)) {
      course_assignments <- values$assignments[values$assignments$Course == input$selected_course, ]
      if (nrow(course_assignments) > 0) {
        ggplot(course_assignments, aes(x = reorder(Assignment, Date_Added), y = Percentage, fill = Category)) +
          geom_col() +
          coord_flip() +
          labs(title = "Assignment Performance", x = "Assignment", y = "Percentage (%)") +
          theme_minimal() +
          theme(legend.position = "bottom")
      }
    }
  })
  
  # Course comparison plot
  output$course_comparison_plot <- renderPlot({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        ggplot(courses_with_grades, aes(x = reorder(Course_Code, Current_Grade), y = Current_Grade, fill = Letter_Grade)) +
          geom_col() +
          coord_flip() +
          labs(title = "Course Performance Comparison", x = "Course", y = "Current Grade (%)") +
          theme_minimal() +
          theme(legend.position = "bottom")
      }
    }
  })
  
  # Study time plot
  output$study_time_plot <- renderPlot({
    if (nrow(values$study_log) > 0) {
      study_summary <- values$study_log %>%
        group_by(Course, Date) %>%
        summarise(Total_Hours = sum(Hours), .groups = "drop")
      
      ggplot(study_summary, aes(x = Date, y = Total_Hours, color = Course)) +
        geom_line(size = 1) +
        geom_point(size = 2) +
        labs(title = "Study Time Trends", x = "Date", y = "Hours Studied") +
        theme_minimal() +
        theme(legend.position = "bottom")
    }
  })
  
  # Semester summary
  output$semester_summary <- renderTable({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        data.frame(
          Metric = c("Total Courses", "Total Credits", "Average Grade", "Highest Grade", "Lowest Grade"),
          Value = c(
            nrow(courses_with_grades),
            sum(courses_with_grades$Credits),
            paste0(round(mean(courses_with_grades$Current_Grade), 1), "%"),
            paste0(round(max(courses_with_grades$Current_Grade), 1), "%"),
            paste0(round(min(courses_with_grades$Current_Grade), 1), "%")
          )
        )
      }
    }
  }, striped = TRUE)
  
  # Performance metrics
  output$performance_metrics <- renderUI({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        avg_grade <- mean(courses_with_grades$Current_Grade)
        total_assignments <- nrow(values$assignments)
        total_study_hours <- sum(values$study_log$Hours)
        
        div(
          div(class = "metric-box",
            div(class = "metric-value", round(avg_grade, 1)),
            div(class = "metric-label", "Average Grade (%)")
          ),
          div(class = "metric-box",
            div(class = "metric-value", total_assignments),
            div(class = "metric-label", "Total Assignments")
          ),
          div(class = "metric-box",
            div(class = "metric-value", round(total_study_hours, 1)),
            div(class = "metric-label", "Study Hours Logged")
          )
        )
      }
    }
  })
  
  # Grade distribution plot
  output$grade_distribution <- renderPlot({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        ggplot(courses_with_grades, aes(x = Letter_Grade, fill = Letter_Grade)) +
          geom_bar() +
          labs(title = "Grade Distribution", x = "Letter Grade", y = "Count") +
          theme_minimal() +
          theme(legend.position = "none")
      }
    }
  })
  
  # Report overview
  output$report_overview <- renderTable({
    if (nrow(values$courses) > 0) {
      courses_with_grades <- values$courses[values$courses$Letter_Grade != "N/A", ]
      if (nrow(courses_with_grades) > 0) {
        total_points <- sum(courses_with_grades$GPA_Points * courses_with_grades$Credits)
        total_credits <- sum(courses_with_grades$Credits)
        gpa <- if (total_credits > 0) total_points / total_credits else 0
        
        data.frame(
          Summary = c("Overall GPA", "Courses Completed", "Total Credits", "Study Hours"),
          Value = c(
            round(gpa, 3),
            nrow(courses_with_grades),
            total_credits,
            round(sum(values$study_log$Hours), 1)
          )
        )
      }
    }
  }, striped = TRUE)
  
  # Download report
  output$download_report <- downloadHandler(
    filename = function() {
      paste0("academic_report_", Sys.Date(), ".csv")
    },
    content = function(file) {
      write.csv(values$courses, file, row.names = FALSE)
    }
  )
}

# =============================================================================
# RUN APPLICATION
# =============================================================================

shinyApp(ui = ui, server = server)

# =============================================================================
# INSTALLATION INSTRUCTIONS
# =============================================================================

# To run this app, you only need base R packages that come with R:
# - shiny (usually pre-installed)
# - ggplot2 
# - dplyr

# If you get errors, install missing packages:
# install.packages(c("shiny", "ggplot2", "dplyr"))

# To run the app:
# 1. Save this code as "grade_calculator.R"
# 2. In R/RStudio, run: shiny::runApp("grade_calculator.R")
# 3. Or click "Run App" button in RStudio