# Grade Calculator and Course Performance Tracker
# A comprehensive Shiny application for academic performance management

# Load required libraries
library(shiny)
library(shinydashboard)
library(DT)
library(ggplot2)
library(dplyr)
library(plotly)
library(shinycssloaders)
library(shinyWidgets)
install.packages(c("shiny", "shinydashboard", "DT", "ggplot2", 
                   "dplyr", "plotly", "shinycssloaders", "shinyWidgets"))

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
  target_points <- target_grade / 100
  current_contribution <- current_points * current_weight / 100
  needed_contribution <- target_points - current_contribution
  needed_grade <- (needed_contribution * 100) / remaining_weight
  return(round(needed_grade, 2))
}

# =============================================================================
# UI DEFINITION
# =============================================================================

ui <- dashboardPage(
  dashboardHeader(title = "Grade Calculator & Performance Tracker"),
  
  dashboardSidebar(
    sidebarMenu(
      menuItem("Course Manager", tabName = "courses", icon = icon("graduation-cap")),
      menuItem("Grade Calculator", tabName = "calculator", icon = icon("calculator")),
      menuItem("Performance Analysis", tabName = "analysis", icon = icon("chart-line")),
      menuItem("Goal Setting", tabName = "goals", icon = icon("target")),
      menuItem("Reports", tabName = "reports", icon = icon("file-text"))
    )
  ),
  
  dashboardBody(
    tags$head(
      tags$style(HTML("
        .content-wrapper, .right-side {
          background-color: #f4f4f4;
        }
        .box {
          border-radius: 8px;
        }
        .grade-display {
          font-size: 24px;
          font-weight: bold;
          text-align: center;
          padding: 15px;
          border-radius: 8px;
          margin: 10px 0;
        }
        .grade-A { background-color: #d4edda; color: #155724; }
        .grade-B { background-color: #cce5ff; color: #004085; }
        .grade-C { background-color: #fff3cd; color: #856404; }
        .grade-D { background-color: #f8d7da; color: #721c24; }
        .grade-F { background-color: #f5c6cb; color: #721c24; }
      "))
    ),
    
    tabItems(
      # Course Manager Tab
      tabItem(tabName = "courses",
        fluidRow(
          box(
            title = "Add New Course", status = "primary", solidHeader = TRUE, width = 12,
            fluidRow(
              column(3, textInput("course_name", "Course Name", placeholder = "e.g., Calculus I")),
              column(3, textInput("course_code", "Course Code", placeholder = "e.g., MATH 101")),
              column(2, numericInput("course_credits", "Credits", value = 3, min = 1, max = 6)),
              column(2, selectInput("grading_scale", "Grading Scale", choices = names(grading_scales))),
              column(2, br(), actionButton("add_course", "Add Course", class = "btn-primary"))
            )
          )
        ),
        
        fluidRow(
          box(
            title = "My Courses", status = "info", solidHeader = TRUE, width = 12,
            withSpinner(DT::dataTableOutput("courses_table"))
          )
        )
      ),
      
      # Grade Calculator Tab
      tabItem(tabName = "calculator",
        fluidRow(
          box(
            title = "Select Course", status = "primary", solidHeader = TRUE, width = 4,
            selectInput("selected_course", "Choose Course", choices = NULL),
            hr(),
            h4("Add Assignment/Exam"),
            textInput("assignment_name", "Assignment Name"),
            numericInput("assignment_points", "Points Earned", value = 0, min = 0),
            numericInput("assignment_total", "Total Points", value = 100, min = 1),
            numericInput("assignment_weight", "Weight (%)", value = 10, min = 0, max = 100),
            selectInput("assignment_category", "Category", 
                       choices = c("Homework", "Quiz", "Exam", "Project", "Lab", "Participation")),
            actionButton("add_assignment", "Add Assignment", class = "btn-success")
          ),
          
          box(
            title = "Current Grade", status = "success", solidHeader = TRUE, width = 8,
            div(id = "current_grade_display", class = "grade-display"),
            br(),
            h4("Grade Breakdown"),
            withSpinner(plotlyOutput("grade_breakdown_plot", height = "300px")),
            br(),
            h4("Assignments"),
            withSpinner(DT::dataTableOutput("assignments_table"))
          )
        )
      ),
      
      # Performance Analysis Tab
      tabItem(tabName = "analysis",
        fluidRow(
          box(
            title = "Overall GPA", status = "primary", solidHeader = TRUE, width = 4,
            div(id = "gpa_display", class = "grade-display"),
            br(),
            h4("Semester Summary"),
            tableOutput("semester_summary")
          ),
          
          box(
            title = "Grade Trends", status = "info", solidHeader = TRUE, width = 8,
            withSpinner(plotlyOutput("grade_trends_plot"))
          )
        ),
        
        fluidRow(
          box(
            title = "Course Comparison", status = "warning", solidHeader = TRUE, width = 12,
            withSpinner(plotlyOutput("course_comparison_plot"))
          )
        )
      ),
      
      # Goal Setting Tab
      tabItem(tabName = "goals",
        fluidRow(
          box(
            title = "Grade Goals", status = "primary", solidHeader = TRUE, width = 6,
            selectInput("goal_course", "Select Course", choices = NULL),
            numericInput("target_grade", "Target Grade (%)", value = 90, min = 0, max = 100),
            actionButton("calculate_needed", "Calculate What's Needed", class = "btn-info"),
            br(), br(),
            div(id = "goal_results")
          ),
          
          box(
            title = "Study Time Tracker", status = "success", solidHeader = TRUE, width = 6,
            selectInput("study_course", "Course", choices = NULL),
            dateInput("study_date", "Date", value = Sys.Date()),
            numericInput("study_hours", "Hours Studied", value = 0, min = 0, max = 24, step = 0.5),
            textAreaInput("study_notes", "Study Notes", rows = 3),
            actionButton("add_study_time", "Log Study Time", class = "btn-success")
          )
        ),
        
        fluidRow(
          box(
            title = "Study Time Analysis", status = "info", solidHeader = TRUE, width = 12,
            withSpinner(plotlyOutput("study_time_plot"))
          )
        )
      ),
      
      # Reports Tab
      tabItem(tabName = "reports",
        fluidRow(
          box(
            title = "Academic Report", status = "primary", solidHeader = TRUE, width = 12,
            fluidRow(
              column(4, 
                h4("Current Semester Overview"),
                tableOutput("report_overview")
              ),
              column(4,
                h4("Grade Distribution"),
                plotOutput("grade_distribution", height = "250px")
              ),
              column(4,
                h4("Performance Metrics"),
                tableOutput("performance_metrics")
              )
            ),
            br(),
            downloadButton("download_report", "Download Full Report", class = "btn-primary")
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
        weighted_grade <- sum(course_assignments$Percentage * course_assignments$Weight / 100) / 
                         sum(course_assignments$Weight / 100)
        
        # Update courses table
        course_idx <- which(values$courses$Course_Code == input$selected_course)
        values$courses$Current_Grade[course_idx] <- weighted_grade
        
        # Calculate letter grade
        grading_scale <- values$courses$Grading_Scale[course_idx]
        letter_info <- calculate_letter_grade(weighted_grade, grading_scale)
        values$courses$Letter_Grade[course_idx] <- letter_info$grade
        values$courses$GPA_Points[course_idx] <- letter_info$gpa
      }
      
      # Clear inputs
      updateTextInput(session, "assignment_name", value = "")
      updateNumericInput(session, "assignment_points", value = 0)
      updateNumericInput(session, "assignment_total", value = 100)
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
          current_weighted_points <- sum(course_assignments$Percentage * course_assignments$Weight / 100)
          current_grade <- current_weighted_points / total_weight_used * 100
          
          needed_grade <- calculate_needed_grade(
            current_grade, total_weight_used, input$target_grade, remaining_weight
          )
          
          result_text <- paste0(
            "<h4>Goal Analysis for ", input$goal_course, "</h4>",
            "<p><strong>Current Grade:</strong> ", round(current_grade, 2), "%</p>",
            "<p><strong>Target Grade:</strong> ", input$target_grade, "%</p>",
            "<p><strong>Remaining Weight:</strong> ", remaining_weight, "%</p>",
            "<p><strong>Grade Needed on Remaining Work:</strong> ", 
            ifelse(needed_grade > 100, 
                   paste0("<span style='color:red;'>", needed_grade, "% (Not achievable)</span>"),
                   paste0("<span style='color:", 
                          ifelse(needed_grade > 90, "red", ifelse(needed_grade > 80, "orange", "green")),
                          ";'>", needed_grade, "%</span>")), "</p>"
          )
          
          output$goal_results <- renderUI({
            HTML(result_text)
          })
        } else {
          output$goal_results <- renderUI({
            HTML("<p style='color:orange;'>All assignments completed for this course.</p>")
          })
        }
      } else {
        output$goal_results <- renderUI({
          HTML("<p style='color:red;'>No assignments found for this course.</p>")
        })
      }
    }
  })
  
  # Render tables and plots
  output$courses_table <- DT::renderDataTable({
    DT::datatable(values$courses, options = list(pageLength = 10, scrollX = TRUE))
  })
  
  output$assignments_table <- DT::renderDataTable({
    if (!is.null(input$selected_course)) {
      course_assignments <- values$assignments[values$assignments$Course == input$selected_course, ]
      DT::datatable(course_assignments, options = list(pageLength = 10, scrollX = TRUE))
    }
  })
  
  # Current grade display
  output$current_grade_display <- renderUI({
    if (!is.null(input$selected_course)) {
      course_idx <- which(values$courses$Course_Code == input$selected_course)
      if (length(course_idx) > 0) {
        current_grade <- values$courses$Current_Grade[course_idx]
        letter_grade <- values$courses$Letter_Grade[course_idx]
        
        grade_class <- paste0("grade-", substr(letter_grade, 1, 1))
        
        div(
          class = paste("grade-display", grade_class),
          h3(paste0(round(current_grade, 2), "% (", letter_grade, ")"))
        )
      }
    }
  })
  
  # GPA display
  output$gpa_display <- renderUI({
    if (nrow(values$courses) > 0) {
      total_points <- sum(values$courses$GPA_Points * values$courses$Credits)
      total_credits <- sum(values$courses$Credits)
      gpa <- if (total_credits > 0) total_points / total_credits else 0
      
      div(
        class = "grade-display grade-A",
        h3(paste0("GPA: ", round(gpa, 3)))
      )
    }
  })
  
  # Grade breakdown plot
  output$grade_breakdown_plot <- renderPlotly({
    if (!is.null(input$selected_course)) {
      course_assignments <- values$assignments[values$assignments$Course == input$selected_course, ]
      if (nrow(course_assignments) > 0) {
        p <- ggplot(course_assignments, aes(x = reorder(Assignment, Date_Added), y = Percentage, fill = Category)) +
          geom_col() +
          coord_flip() +
          labs(title = "Assignment Performance", x = "Assignment", y = "Percentage") +
          theme_minimal()
        
        ggplotly(p)
      }
    }
  })
  
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
# ADDITIONAL FEATURES TO IMPLEMENT
# =============================================================================

# 1. Data persistence (save to file)
# 2. Import grades from CSV
# 3. Weighted category system
# 4. Semester/term management
# 5. Grade prediction models
# 6. Mobile-responsive design
# 7. Email notifications for deadlines
# 8. Integration with school systems

