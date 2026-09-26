@ui @Regression
Feature: Login
  Credentials come from APP_USERNAME and APP_PASSWORD (see .env.example),
  never from feature files. The demo app uses built-in demo credentials.

  Background:
    Given I am on the login page

  Scenario: The page has the expected structure
    Then the page structure is:
      """yaml
      - main:
        - heading "Log in" [level=1]
        - text: Username
        - textbox "Username"
        - text: Password
        - textbox "Password"
        - button "Log in"
        - alert
      """

  @Smoke
  Scenario: Log in with valid credentials
    When I log in with the configured credentials
    Then I am welcomed as the configured user

  Scenario: A wrong password is rejected
    When I log in as the configured user with the password "not-the-password"
    Then I see the login error "Invalid username or password"
